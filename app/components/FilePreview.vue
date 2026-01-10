<template>
  <div class="file-preview-container w-full h-full flex flex-col">
    <!-- Toolbar for Image -->
    <div v-if="type === 'image'" class="flex justify-center gap-2 mb-2 p-2 bg-black/10 rounded">
      <n-button-group size="small">
        <n-button secondary @click="zoomOut" title="缩小">
          <template #icon><n-icon><RemoveOutline /></n-icon></template>
        </n-button>
        <n-button secondary @click="resetZoom" title="重置">
          {{ Math.round(scale * 100) }}%
        </n-button>
        <n-button secondary @click="zoomIn" title="放大">
          <template #icon><n-icon><AddOutline /></n-icon></template>
        </n-button>
      </n-button-group>
      <n-button-group size="small">
        <n-button secondary @click="rotateLeft" title="向左旋转">
          <template #icon><n-icon><RefreshOutline class="transform -scale-x-100" /></n-icon></template>
        </n-button>
        <n-button secondary @click="rotateRight" title="向右旋转">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
        </n-button>
      </n-button-group>
    </div>

    <!-- Content Area -->
    <div 
      class="flex-1 overflow-hidden relative flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
      ref="containerRef"
      @wheel="handleWheel"
      @mousedown.prevent="startDrag"
    >
      <!-- Image -->
      <div
        v-if="type === 'image'"
        class="origin-center cursor-move transition-transform ease-out"
        :class="isDragging ? 'duration-0' : 'duration-200'"
        :style="{
          transform: `scale(${scale}) rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`
        }"
      >
        <img 
          ref="imgRef"
          :src="url" 
          :alt="fileName" 
          class="max-w-full max-h-full object-contain select-none pointer-events-none" 
          style="display: block;"
          draggable="false"
          @load="onImageLoad"
          @error="onImageError"
        />
      </div>

      <!-- Video -->
      <video
        v-else-if="type === 'video'"
        :src="url"
        controls
        class="max-w-full max-h-full"
      ></video>

      <!-- Audio -->
      <audio
        v-else-if="type === 'audio'"
        :src="url"
        controls
        class="w-full max-w-md"
      ></audio>
      
      <!-- Fallback -->
      <div v-else class="text-gray-500">
        暂不支持预览此类型文件
      </div>
      
      <!-- Error State -->
      <div v-if="hasError" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div class="text-center text-red-500">
          <n-icon size="48"><AlertCircleOutline /></n-icon>
          <p class="mt-2">无法加载预览</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NButton, NButtonGroup, NIcon } from 'naive-ui';
import { 
  AddOutline, 
  RemoveOutline, 
  RefreshOutline,
  AlertCircleOutline
} from '@vicons/ionicons5';

const props = defineProps<{
  url: string;
  type: 'image' | 'video' | 'audio' | 'other';
  fileName: string;
}>();

// State
const scale = ref(1);
const rotation = ref(0);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const hasError = ref(false);

const containerRef = ref<HTMLElement | null>(null);

const imgRef = ref<HTMLImageElement | null>(null);

// Reset state when url changes
watch(() => props.url, () => {
  scale.value = 1;
  rotation.value = 0;
  translateX.value = 0;
  translateY.value = 0;
  hasError.value = false;
});

// Methods
const zoomIn = () => {
  scale.value = Math.min(scale.value * 1.2, 5);
};

const zoomOut = () => {
  scale.value = Math.max(scale.value / 1.2, 0.1);
};

const resetZoom = () => {
  scale.value = 1;
  rotation.value = 0;
  translateX.value = 0;
  translateY.value = 0;
};

const rotateLeft = () => {
  rotation.value -= 90;
};

const rotateRight = () => {
  rotation.value += 90;
};

const handleWheel = (e: WheelEvent) => {
  if (props.type !== 'image') return;
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
};

const startDrag = (e: MouseEvent) => {
  if (props.type !== 'image') return;
  e.preventDefault();
  isDragging.value = true;
  // Store initial mouse position
  startX.value = e.clientX;
  startY.value = e.clientY;
  
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', endDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
  
  // Calculate delta
  const dx = e.clientX - startX.value;
  const dy = e.clientY - startY.value;
  
  // Update start position for next frame
  startX.value = e.clientX;
  startY.value = e.clientY;

  // Apply delta adjusted by scale
  // If scale is 2, moving mouse 10px should move image 10px visually
  // visual_move = logical_move * scale => logical_move = visual_move / scale
  const adjustedDx = dx / scale.value;
  const adjustedDy = dy / scale.value;

  const newX = translateX.value + adjustedDx;
  const newY = translateY.value + adjustedDy;
  
  // Boundary check: limit translation
  if (containerRef.value && imgRef.value) {
    const cw = containerRef.value.clientWidth;
    const ch = containerRef.value.clientHeight;
    // We need the rendered dimensions of the image (before transform)
    // imgRef.value.width/height gives the rendered size (due to object-contain)
    const iw = imgRef.value.width * scale.value;
    const ih = imgRef.value.height * scale.value;
    
    // Calculate limits
    // If image > container, we allow panning until edges meet
    // If image < container, we allow panning but keep it inside? Or center?
    // Let's allow panning such that the image doesn't go completely out of view?
    // User requested: "prevent moving image out of panel border"
    // Strict interpretation: Image must not leave the box? Or Image must not be completely hidden?
    // "Prevent moving image out of panel border" usually means "Don't let me lose the image".
    // Better UX: 
    // If IW > CW: Limit |x| <= (IW - CW) / 2
    // If IW < CW: Limit |x| <= (CW - IW) / 2
    
    // NOTE: Because transform is scale() translate(), the translation is in PRE-SCALED units?
    // No, transform: scale(S) translate(Tx) means translate(Tx) happens in SCALED coordinate system.
    // So visual offset = Tx * S.
    // We want VisualOffset <= (IW - CW) / 2
    // So Tx * S <= (IW - CW) / 2
    // So Tx <= (IW - CW) / (2 * S)
    
    // If IW < CW:
    // We want VisualOffset <= (CW - IW) / 2
    // Tx <= (CW - IW) / (2 * S)
    
    const limitX = Math.abs(cw - iw) / (2 * scale.value);
    const limitY = Math.abs(ch - ih) / (2 * scale.value);
    
    // Add a small buffer (e.g. 50px) to prevent sticking too hard?
    // Or stick strictly.
    // Let's stick strictly as requested.
    
    if (Math.abs(newX) <= limitX) translateX.value = newX;
    else translateX.value = newX > 0 ? limitX : -limitX;
    
    if (Math.abs(newY) <= limitY) translateY.value = newY;
    else translateY.value = newY > 0 ? limitY : -limitY;
  } else {
     translateX.value = newX;
     translateY.value = newY;
  }
};

const endDrag = () => {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', endDrag);
};

const onImageLoad = () => {
  hasError.value = false;
};

const onImageError = () => {
  hasError.value = true;
};
</script>

<style scoped>
.file-preview-container {
  min-height: 400px;
}
</style>
