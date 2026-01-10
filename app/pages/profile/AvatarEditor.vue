<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { NUpload, NButton, NSlider, NPopconfirm, NIcon } from "naive-ui";
import { RefreshOutline } from "@vicons/ionicons5";
import DefaultAvatar from "~/assets/images/avatar/image.png";

const props = defineProps<{ initialSrc?: string }>();
const emit = defineEmits<{
  (e: "save", file: Blob): void;
  (e: "cancel"): void;
}>();

const src = ref<string | null>(null);
const scale = ref(1.0);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const image = new Image();
let imageLoaded = false;
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
const lastX = ref(0);
const lastY = ref(0);
const hasInteracted = ref(false);
const minScale = ref(1);
const maxScale = 5;
const rotation = ref(0);
const fileList = ref<any[]>([]);
function getPoint(e: any) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}
function onStart(e: any) {
  const p = getPoint(e);
  isDragging.value = true;
  hasInteracted.value = true;
  lastX.value = p.x;
  lastY.value = p.y;
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd);
}
function onMove(e: any) {
  if (!isDragging.value) return;
  const p = getPoint(e);
  const dx = p.x - lastX.value;
  const dy = p.y - lastY.value;
  lastX.value = p.x;
  lastY.value = p.y;
  panX.value += dx;
  panY.value += dy;
  clampPan();
  draw();
}

function clampPan() {
  const size = 400;
  const iw = image.width;
  const ih = image.height;
  const s = scale.value;
  const targetW = iw * s;
  const targetH = ih * s;
  const minX = (size - targetW) / 2;
  const maxX = (targetW - size) / 2;
  const minY = (size - targetH) / 2;
  const maxY = (targetH - size) / 2;
  panX.value = Math.max(minX, Math.min(maxX, panX.value));
  panY.value = Math.max(minY, Math.min(maxY, panY.value));
}
function onEnd() {
  isDragging.value = false;
  window.removeEventListener("mousemove", onMove);
  window.removeEventListener("mouseup", onEnd);
  window.removeEventListener("touchmove", onMove as any);
  window.removeEventListener("touchend", onEnd);
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || !src.value || !imageLoaded) return;
  const ctx = canvas.getContext("2d")!;
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  
  ctx.save();
  // No clipping - save full square image
  // Rounded preview is handled by CSS on the container
  ctx.imageSmoothingEnabled = true;

  // Draw image
  // Order: Translate to center -> Apply Pan -> Rotate -> Scale -> Draw centered
  // To ensure Pan works in screen coordinates (dragging right moves image right regardless of rotation),
  // we translate by panX/panY FIRST (relative to screen center).
  ctx.translate(cx + panX.value, cy + panY.value);
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.scale(scale.value, scale.value);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();
}

function onFileChange({ file }: any) {
  if (!file || !file.file) return;
  const reader = new FileReader();
  reader.onload = () => {
    src.value = reader.result as string;
    image.onload = () => {
      imageLoaded = true;
      const size = 400;
      const iw = image.width;
      const ih = image.height;
      minScale.value = size / Math.min(iw, ih);
      if (scale.value < minScale.value) scale.value = minScale.value;
      if (scale.value > maxScale) scale.value = maxScale;
      panX.value = 0;
      panY.value = 0;
      draw();
    };
    image.src = src.value!;
  };
  reader.readAsDataURL(file.file as File);
}

watch(scale, () => draw());

onMounted(() => {
  if (props.initialSrc) {
    if (props.initialSrc.startsWith("http") || props.initialSrc.startsWith("data:")) {
      src.value = props.initialSrc;
    } else {
      // 如果是 UUID，尝试构建 URL
      // 注意：AvatarEditor 不负责加载 Token，这里只负责显示
      // 如果需要鉴权，应该在父组件加载完 blob url 传进来
      // 但为了兼容，这里做个回退
      // 实际上父组件现在传进来的是 avatarUrl (blob url) 或者 DefaultAvatar
      src.value = props.initialSrc;
    }
    image.onload = () => {
      imageLoaded = true;
      const size = 400;
      const iw = image.width;
      const ih = image.height;
      minScale.value = size / Math.min(iw, ih);
      if (scale.value < minScale.value) scale.value = minScale.value;
      if (scale.value > maxScale) scale.value = maxScale;
      panX.value = 0;
      panY.value = 0;
      draw();
    };
    image.src = props.initialSrc!;
  }
});

async function handleSave() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );
  if (blob) emit("save", blob);
}

function handleCancel() {
  emit("cancel");
}

function rotateLeft() {
  rotation.value -= 90;
  draw();
}

function rotateRight() {
  rotation.value += 90;
  draw();
}

function onWheel(e: any) {
  const step = 0.05;
  const next = scale.value + (e.deltaY > 0 ? -step : step);
  scale.value = Math.min(maxScale, Math.max(minScale.value, next));
  clampPan();
  draw();
}

function resetPosition() {
  panX.value = 0;
  panY.value = 0;
  scale.value = Math.max(1, minScale.value);
  clampPan();
  draw();
}

function setDefaultAvatar() {
  fileList.value = [];
  src.value = DefaultAvatar as any;
  image.onload = () => {
    imageLoaded = true;
    const size = 400;
    const iw = image.width;
    const ih = image.height;
    minScale.value = size / Math.min(iw, ih);
    scale.value = Math.max(minScale.value, 1);
    panX.value = 0;
    panY.value = 0;
    clampPan();
    draw();
  };
  image.src = DefaultAvatar as any;
}
</script>

<template>
  <div
    class="w-full max-w-[560px] p-4 bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-color)]"
  >
    <div class="flex gap-6">
      <div class="w-[130px]">
        <n-upload
          accept="image/*"
          list-type="image-card"
          :max="1"
          v-model:file-list="fileList"
          :on-change="onFileChange"
        />
        <div class="mt-4">
          <n-slider
            v-model:value="scale"
            :min="minScale"
            :max="maxScale"
            :step="0.05"
            :tooltip="false"
          />
          <div class="mt-2 text-xs text-[var(--text-secondary)]">
            倍率：{{ scale.toFixed(2) }}x
          </div>
        </div>
        
        <div class="mt-4 flex gap-2 justify-center">
          <n-button circle secondary @click="rotateLeft" title="向左旋转">
            <template #icon><n-icon><RefreshOutline class="transform -scale-x-100" /></n-icon></template>
          </n-button>
          <n-button circle secondary @click="rotateRight" title="向右旋转">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
          </n-button>
        </div>
      </div>
      <div
        class="w-[400px] h-[400px] rounded-[24px] border border-[var(--border-color)] overflow-hidden touch-none"
      >
        <canvas
          ref="canvasRef"
          class="w-[400px] h-[400px]"
          @wheel.passive="onWheel"
          @mousedown="onStart"
          @mousemove="onMove"
          @mouseup="onEnd"
          @touchstart.passive="onStart"
          @touchmove.passive="onMove"
          @touchend="onEnd"
        />
      </div>
    </div>
    <div class="mt-4 flex justify-between items-center gap-8">
      <div class="flex gap-4">
        <n-button secondary @click="resetPosition">重置位置</n-button>
        <n-popconfirm
          title="默认头像"
          positive-text="确定"
          negative-text="取消"
          @positive-click="setDefaultAvatar"
        >
          <template #trigger>
            <n-button secondary>默认头像</n-button>
          </template>
          切换为默认头像并清除已上传的图片？
        </n-popconfirm>
      </div>
      <div class="flex gap-4">
        <n-button secondary @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleSave">保存</n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.n-slider .n-slider-handle-info,
.n-slider .n-slider-handle-indicator,
.n-slider .n-slider-marks {
  display: none !important;
}
</style>
