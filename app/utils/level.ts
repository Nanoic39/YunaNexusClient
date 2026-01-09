/**
 * 经验值等级配置接口
 */
export interface LevelConfig {
  /** 等级 */
  level: number;
  /** 该等级所需总经验值 */
  requiredExp: number;
}

/**
 * 默认等级配置
 * 示例配置：
 * 0级: 0 xp
 * 1级: 100 xp
 * 2级: 300 xp (100 + 200)
 * 3级: 600 xp (300 + 300)
 * ...
 */
export const LEVEL_CONFIG: LevelConfig[] = [];

// 等级配置
let currentExp = 0;
// 记录上一级的增量，用于 101 级后的计算
let lastDelta = 0;

for (let i = 0; i <= 200; i++) { // 扩展到200级或更多，以覆盖101+的情况
  let delta = 0;
  if (i > 0) {
    if (i <= 100) {
      // 前100级：每级所需增量 = 100 * 等级
      delta = 100 * i;
    } else {
      // 101级后：每级所需增量 = 上一级增量 + 10 * 等级
      // 解释：{级别-1}的经验 (理解为上一级所需经验/增量) + 10 * 等级
      delta = lastDelta + 10 * i;
    }
    currentExp += delta;
    lastDelta = delta;
  }
  
  LEVEL_CONFIG.push({
    level: i,
    requiredExp: currentExp
  });
}

/**
 * 根据经验值计算当前等级
 * @param exp 当前总经验值
 * @returns 当前等级
 */
export const calculateLevel = (exp: number): number => {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    const config = LEVEL_CONFIG[i];
    if (config && exp >= config.requiredExp) {
      return config.level;
    }
  }
  return 0;
};

/**
 * 获取当前等级升级所需总经验值（下一级所需总经验值）
 * @param level 当前等级
 * @returns 下一级所需总经验值，如果是最高级则返回当前所需
 */
export const getNextLevelExp = (level: number): number => {
  const nextLevel = level + 1;
  const config = LEVEL_CONFIG.find(c => c.level === nextLevel);
  const maxConfig = LEVEL_CONFIG[LEVEL_CONFIG.length - 1];
  return config ? config.requiredExp : (maxConfig ? maxConfig.requiredExp : 0);
};

/**
 * 获取当前等级起始经验值（当前级所需总经验值）
 * @param level 当前等级
 */
export const getCurrentLevelStartExp = (level: number): number => {
  const config = LEVEL_CONFIG.find(c => c.level === level);
  return config ? config.requiredExp : 0;
};

/**
 * 计算当前等级进度信息
 * @param exp 当前总经验值
 */
export const calculateLevelProgress = (exp: number) => {
  const currentLevel = calculateLevel(exp);
  const nextLevelExp = getNextLevelExp(currentLevel);
  const currentLevelStartExp = getCurrentLevelStartExp(currentLevel);

  // 当前等级内的进度 = 当前总经验 - 当前等级起始经验
  const currentProgress = exp - currentLevelStartExp;
  // 当前等级升级所需增量 = 下一级总经验 - 当前等级起始经验
  const requiredProgress = nextLevelExp - currentLevelStartExp;

  // 进度百分比
  let percentage = 0;
  if (requiredProgress > 0) {
    percentage = Math.min(100, Math.max(0, (currentProgress / requiredProgress) * 100));
  } else {
    // 已达最高级
    percentage = 100;
  }

  return {
    level: currentLevel,
    currentExp: exp,
    nextLevelTotalExp: nextLevelExp,
    levelStartExp: currentLevelStartExp,
    currentProgress, // 当前等级内已获得的经验
    requiredProgress, // 当前等级升级所需总经验增量
    percentage: percentage.toFixed(2)
  };
};