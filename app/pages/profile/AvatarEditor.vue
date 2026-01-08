<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { NUpload, NButton, NSlider } from "naive-ui";

const props = defineProps<{ initialSrc?: string }>();
const emit = defineEmits<{ (e: "save", file: Blob): void; (e: "cancel"): void }>();

const src = ref<string | null>(null);
const scale = ref(1.2);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const image = new Image();
let imageLoaded = false;
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
const lastX = ref(0);
const lastY = ref(0);
function getPoint(e: any) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}
function onStart(e: any) {
  const p = getPoint(e);
  isDragging.value = true;
  lastX.value = p.x;
  lastY.value = p.y;
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
  draw();
}
function onEnd() {
  isDragging.value = false;
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || !src.value || !imageLoaded) return;
  const ctx = canvas.getContext("2d")!;
  const size = 320;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  const iw = image.width;
  const ih = image.height;
  const s = scale.value;
  const targetW = iw * s;
  const targetH = ih * s;
  const dx = (size - targetW) / 2 + panX.value;
  const dy = (size - targetH) / 2 + panY.value;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, dx, dy, targetW, targetH);
  ctx.restore();
  ctx.strokeStyle = "rgba(102, 146, 225, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();
}

function onFileChange({ file }: any) {
  if (!file || !file.file) return;
  const reader = new FileReader();
  reader.onload = () => {
    src.value = reader.result as string;
    image.onload = () => {
      imageLoaded = true;
      draw();
    };
    image.src = src.value!;
  };
  reader.readAsDataURL(file.file as File);
}

watch(scale, () => draw());

onMounted(() => {
  if (props.initialSrc) {
    src.value = props.initialSrc;
    image.onload = () => {
      imageLoaded = true;
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
</script>

<template>
  <div class="w-full max-w-[800px]">
    <div class="flex gap-12">
      <div class="flex-1">
        <n-upload
          accept="image/*"
          list-type="image-card"
          :max="1"
          :default-file-list="[]"
          :on-change="onFileChange"
        />
        <div class="mt-4">
          <n-slider v-model:value="scale" :min="1" :max="3" :step="0.05" />
        </div>
      </div>
      <div class="w-[320px] h-[320px] rounded-2xl border border-[var(--border-color)] overflow-hidden touch-none">
        <canvas
          ref="canvasRef"
          class="w-[320px] h-[320px]"
          @mousedown="onStart"
          @mousemove="onMove"
          @mouseup="onEnd"
          @mouseleave="onEnd"
          @touchstart.passive="onStart"
          @touchmove.passive="onMove"
          @touchend="onEnd"
        />
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-8">
      <n-button secondary @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleSave">保存</n-button>
    </div>
  </div>
</template>