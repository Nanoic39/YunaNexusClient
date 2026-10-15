<script setup lang="ts">
import { onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { NButton, NModal, NSlider, NAlert, useMessage } from 'naive-ui'
const props = defineProps<{ saving: boolean }>()
const emit = defineEmits<{ save: [file: File] }>()
const message = useMessage(),
  open = ref(false),
  canvas = ref<HTMLCanvasElement>(),
  picker = ref<HTMLInputElement>()
const zoom = ref(1),
  x = ref(0),
  y = ref(0),
  rotation = ref(0),
  error = ref(''),
  reading = ref(false)
let image: HTMLImageElement | undefined,
  url = '',
  turn = 0,
  drag: { x: number; y: number; ox: number; oy: number } | undefined
function dispose() {
  turn++
  if (url) URL.revokeObjectURL(url)
  url = ''
  image = undefined
}
function close() {
  if (props.saving) return
  open.value = false
  dispose()
}
defineExpose({ close })
function rotate() {
  rotation.value = (rotation.value + 90) % 360
  x.value = 0
  y.value = 0
}
function reset() {
  zoom.value = 1
  x.value = 0
  y.value = 0
  rotation.value = 0
  draw()
}
async function choose(file?: File) {
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    message.error('请选择不超过 5MB 的 JPEG 或 PNG 图片')
    return
  }
  dispose()
  const version = turn
  reading.value = true
  error.value = ''
  open.value = true
  try {
    const img = new Image()
    url = URL.createObjectURL(file)
    img.src = url
    await img.decode()
    if (version !== turn) return
    if (
      img.naturalWidth > 8192 ||
      img.naturalHeight > 8192 ||
      img.naturalWidth * img.naturalHeight > 16000000
    )
      throw new Error('图片尺寸过大，请选择 1600 万像素以内的图片')
    image = img
    reset()
    await nextTick()
    draw()
  } catch (e) {
    if (version === turn) error.value = e instanceof Error ? e.message : '图片读取失败'
  } finally {
    if (version === turn) reading.value = false
  }
}
function changed(event: Event) {
  const input = event.target as HTMLInputElement
  void choose(input.files?.[0])
  input.value = ''
}
function drop(event: DragEvent) {
  void choose(event.dataTransfer?.files[0])
}
function paint(target: HTMLCanvasElement, size: number) {
  if (!image) return
  target.width = size
  target.height = size
  const g = target.getContext('2d')
  if (!g) throw new Error('浏览器无法编辑图片')
  const swapped = rotation.value % 180 !== 0,
    w = swapped ? image.naturalHeight : image.naturalWidth,
    h = swapped ? image.naturalWidth : image.naturalHeight
  const scale = Math.max(size / w, size / h) * zoom.value,
    dx = (((w * scale - size) / 2) * x.value) / 100,
    dy = (((h * scale - size) / 2) * y.value) / 100
  g.fillStyle = '#fff'
  g.fillRect(0, 0, size, size)
  g.translate(size / 2 + dx, size / 2 + dy)
  g.rotate((rotation.value * Math.PI) / 180)
  g.scale(scale, scale)
  g.imageSmoothingQuality = 'high'
  g.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
}
function draw() {
  if (canvas.value) paint(canvas.value, 320)
}
function down(event: PointerEvent) {
  if (props.saving) return
  drag = { x: event.clientX, y: event.clientY, ox: x.value, oy: y.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (!drag || !image) return
  const swapped = rotation.value % 180 !== 0,
    w = swapped ? image.naturalHeight : image.naturalWidth,
    h = swapped ? image.naturalWidth : image.naturalHeight,
    scale = Math.max(320 / w, 320 / h) * zoom.value
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect(),
    factor = 320 / bounds.width
  x.value = Math.max(
    -100,
    Math.min(
      100,
      drag.ox + (((event.clientX - drag.x) * factor) / Math.max(1, (w * scale - 320) / 2)) * 100,
    ),
  )
  y.value = Math.max(
    -100,
    Math.min(
      100,
      drag.oy + (((event.clientY - drag.y) * factor) / Math.max(1, (h * scale - 320) / 2)) * 100,
    ),
  )
}
async function save() {
  if (!image || props.saving) return
  const output = document.createElement('canvas')
  paint(output, 512)
  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, 'image/jpeg', 0.92),
  )
  if (!blob) {
    error.value = '图片导出失败'
    return
  }
  emit('save', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
}
watch([zoom, x, y, rotation], draw)
watch(open, (value) => {
  if (!value) dispose()
})
onBeforeUnmount(dispose)
</script>
<template>
  <div class="avatar-drop" @dragover.prevent @drop.prevent="drop">
    <input
      ref="picker"
      hidden
      type="file"
      accept="image/jpeg,image/png"
      aria-label="选择头像图片"
      @change="changed"
    /><n-button :disabled="saving" @click="picker?.click()">上传新头像</n-button
    ><span>JPEG / PNG，最大 5MB；支持拖入图片</span>
  </div>
  <n-modal
    :show="open"
    preset="card"
    title="编辑头像"
    style="width: 480px; max-width: calc(100vw - 32px)"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    @update:show="
      (value) => {
        if (!value) close()
      }
    "
  >
    <n-alert v-if="error" type="error">{{ error }}</n-alert>
    <p class="hint">拖动图片调整位置，也可以使用下面的滑块。圆形蒙层展示头像效果。</p>
    <div
      class="crop-stage"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="drag = undefined"
      @pointercancel="drag = undefined"
    >
      <canvas ref="canvas" aria-label="头像裁剪预览" />
      <div class="crop-mask" />
    </div>
    <div class="crop-sliders">
      <label
        >缩放<n-slider
          v-model:value="zoom"
          :min="1"
          :max="4"
          :step="0.01"
          :disabled="saving" /></label
      ><label
        >水平位置<n-slider v-model:value="x" :min="-100" :max="100" :disabled="saving" /></label
      ><label
        >垂直位置<n-slider v-model:value="y" :min="-100" :max="100" :disabled="saving"
      /></label>
    </div>
    <div class="editor-actions">
      <n-button :disabled="saving" @click="rotate">旋转 90°</n-button
      ><n-button :disabled="saving" @click="reset">重置</n-button>
    </div>
    <template #footer
      ><div class="editor-actions">
        <n-button :disabled="saving" @click="close">取消</n-button
        ><n-button type="primary" :loading="saving" :disabled="reading || !!error" @click="save"
          >上传并保存头像</n-button
        >
      </div></template
    >
  </n-modal>
</template>
<style scoped>
.avatar-drop {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.avatar-drop span,
.hint {
  font-size: 12px;
  color: var(--yuna-gray-600);
}
.hint {
  margin-bottom: 16px;
}
.crop-stage {
  position: relative;
  width: min(320px, 100%);
  aspect-ratio: 1;
  margin: 0 auto;
  touch-action: none;
  cursor: grab;
  overflow: hidden;
  border-radius: 12px;
  background: #eee;
}
.crop-stage canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.crop-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle, transparent 69%, #0009 70%);
}
.crop-sliders {
  display: grid;
  gap: 10px;
  margin: 20px 0;
}
.crop-sliders label {
  display: grid;
  grid-template-columns: 70px 1fr;
  align-items: center;
  font-size: 12px;
  gap: 12px;
}
.editor-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
