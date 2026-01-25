# P7-001: 动效优化

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P7-001 |
| Phase | 7 - 打磨与优化 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P6-004 |

## 目标

使用 Framer Motion 实现流畅、有意义的过渡动画。

## 任务清单

- [ ] 安装 Framer Motion 依赖
- [ ] 实现面板展开/收起动画
- [ ] 实现页面/面板切换动画
- [ ] 实现列表项进入/退出动画
- [ ] 实现骨架屏加载动画
- [ ] 实现按钮点击反馈动画
- [ ] 优化现有过渡效果

## 验收标准

- [ ] 动画流畅无卡顿
- [ ] 动画时长适中（100-200ms）
- [ ] 动画有意义，不影响效率
- [ ] 符合 Cursor/Linear 风格

## 产出

- `src/lib/animations/variants.ts`
- `src/components/ui/AnimatedList.tsx`
- `src/components/ui/Skeleton.tsx`

## 技术细节

### 动画变体

```typescript
// lib/animations/variants.ts
import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const panelExpand: Variants = {
  collapsed: { width: 0, opacity: 0 },
  expanded: { width: 'auto', opacity: 1 },
};

// 列表项交错动画
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};
```

### 动画配置

```typescript
// lib/animations/config.ts
export const transition = {
  fast: { duration: 0.1, ease: [0.16, 1, 0.3, 1] },
  normal: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  slow: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};
```

### 使用示例

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, transition } from '@/lib/animations';

function Dialog({ isOpen, children }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition.normal}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```
