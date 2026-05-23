// Animated Favicon Worker
// 在 Web Worker 中渲染 favicon 动画，后台标签页也能继续运行

const COLORS = ['#D3F1FF', '#CFEDD9', '#FFDDDD', '#FCF7BD'];
const SIZE = 32;
const COLOR_DURATION = 5000; // 每个颜色停留 5 秒
const TRANSITION_DURATION = 600; // 颜色过渡动画 600ms

// 云朵形状路径 (基于 mark.svg，缩放到 32x32)
const SCALE = SIZE / 46;
const OFFSET_Y = (SIZE - 42 * SCALE) / 2;

function drawCloudPath(ctx) {
  const s = SCALE;
  const oy = OFFSET_Y;
  ctx.beginPath();
  ctx.moveTo(25.0947 * s, 11 * s + oy);
  ctx.bezierCurveTo(26.6053 * s, 11 * s + oy, 27.8799 * s, 12.1235 * s + oy, 28.0703 * s, 13.6221 * s + oy);
  ctx.bezierCurveTo(28.1317 * s, 14.1055 * s + oy, 28.0749 * s, 14.5737 * s + oy, 27.9238 * s, 15 * s + oy);
  ctx.lineTo(30.541 * s, 15 * s + oy);
  ctx.bezierCurveTo(32.4238 * s, 15 * s + oy, 34.0516 * s, 16.3131 * s + oy, 34.4502 * s, 18.1533 * s + oy);
  ctx.bezierCurveTo(34.9899 * s, 20.6457 * s + oy, 33.0911 * s, 23 * s + oy, 30.541 * s, 23 * s + oy);
  ctx.lineTo(33.2275 * s, 23 * s + oy);
  ctx.bezierCurveTo(35.5595 * s, 23 * s + oy, 37.5817 * s, 24.6124 * s + oy, 38.1015 * s, 26.8857 * s + oy);
  ctx.bezierCurveTo(38.8172 * s, 30.0162 * s + oy, 36.4387 * s, 33 * s + oy, 33.2275 * s, 33 * s + oy);
  ctx.lineTo(12.7724 * s, 33 * s + oy);
  ctx.bezierCurveTo(9.56118 * s, 33 * s + oy, 7.18272 * s, 30.0162 * s + oy, 7.8984 * s, 26.8857 * s + oy);
  ctx.bezierCurveTo(8.41825 * s, 24.6124 * s + oy, 10.4404 * s, 23 * s + oy, 12.7724 * s, 23 * s + oy);
  ctx.lineTo(15.4589 * s, 23 * s + oy);
  ctx.bezierCurveTo(12.9088 * s, 23 * s + oy, 11.0101 * s, 20.6457 * s + oy, 11.5498 * s, 18.1533 * s + oy);
  ctx.bezierCurveTo(11.9483 * s, 16.3132 * s + oy, 13.5761 * s, 15 * s + oy, 15.4589 * s, 15 * s + oy);
  ctx.lineTo(18.0761 * s, 15 * s + oy);
  ctx.bezierCurveTo(17.925 * s, 14.5737 * s + oy, 17.8673 * s, 14.1055 * s + oy, 17.9287 * s, 13.6221 * s + oy);
  ctx.bezierCurveTo(18.1191 * s, 12.1234 * s + oy, 19.3946 * s, 11 * s + oy, 20.9052 * s, 11 * s + oy);
  ctx.closePath();
}

function drawMarkPath(ctx) {
  const s = SCALE;
  const oy = OFFSET_Y;
  ctx.beginPath();
  ctx.moveTo(21.7417 * s, 27.353 * s + oy);
  ctx.lineTo(16.4292 * s, 27.353 * s + oy);
  ctx.lineTo(16.4292 * s, 25.058 * s + oy);
  ctx.lineTo(21.7417 * s, 25.058 * s + oy);
  ctx.lineTo(21.7417 * s, 24.157 * s + oy);
  ctx.lineTo(18.2737 * s, 24.157 * s + oy);
  ctx.lineTo(18.2737 * s, 21.981 * s + oy);
  ctx.lineTo(21.7417 * s, 21.981 * s + oy);
  ctx.lineTo(21.7417 * s, 21.131 * s + oy);
  ctx.lineTo(17.5342 * s, 21.131 * s + oy);
  ctx.lineTo(17.5342 * s, 18.836 * s + oy);
  ctx.lineTo(19.0217 * s, 18.836 * s + oy);
  ctx.bezierCurveTo(18.9725 * s, 18.767 * s + oy, 18.9479 * s, 18.7326 * s + oy, 18.9319 * s, 18.7071 * s + oy);
  ctx.bezierCurveTo(18.5595 * s, 18.1133 * s + oy, 18.8976 * s, 17.3307 * s + oy, 19.5852 * s, 17.1948 * s + oy);
  ctx.lineTo(20.0221 * s, 17.1336 * s + oy);
  ctx.lineTo(20.2834 * s, 17.106 * s + oy);
  ctx.bezierCurveTo(20.5657 * s, 17.103 * s + oy, 20.8361 * s, 17.2195 * s + oy, 21.0278 * s, 17.4268 * s + oy);
  ctx.lineTo(21.1871 * s, 17.6357 * s + oy);
  ctx.lineTo(22.0477 * s, 18.836 * s + oy);
  ctx.lineTo(24.2067 * s, 18.836 * s + oy);
  ctx.lineTo(24.5637 * s, 18.292 * s + oy);
  ctx.bezierCurveTo(24.7465 * s, 18.0125 * s + oy, 24.9101 * s, 17.7688 * s + oy, 25.0546 * s, 17.5606 * s + oy);
  ctx.bezierCurveTo(25.3527 * s, 17.2016 * s + oy, 25.659 * s, 17.0668 * s + oy, 25.9325 * s, 17.0708 * s + oy);
  ctx.lineTo(26.3505 * s, 17.1203 * s + oy);
  ctx.bezierCurveTo(26.4572 * s, 17.1348 * s + oy, 26.5105 * s, 17.142 * s + oy, 26.5641 * s, 17.1554 * s + oy);
  ctx.bezierCurveTo(27.2168 * s, 17.3188 * s + oy, 27.5264 * s, 18.1393 * s + oy, 27.1444 * s, 18.6932 * s + oy);
  ctx.lineTo(27.0287 * s, 18.836 * s + oy);
  ctx.lineTo(28.4652 * s, 18.836 * s + oy);
  ctx.lineTo(28.4652 * s, 21.131 * s + oy);
  ctx.lineTo(24.2747 * s, 21.131 * s + oy);
  ctx.lineTo(24.2747 * s, 21.981 * s + oy);
  ctx.lineTo(27.7257 * s, 21.981 * s + oy);
  ctx.lineTo(27.7257 * s, 24.157 * s + oy);
  ctx.lineTo(24.2747 * s, 24.157 * s + oy);
  ctx.lineTo(24.2747 * s, 25.058 * s + oy);
  ctx.lineTo(28.4652 * s, 25.058 * s + oy);
  ctx.lineTo(28.4652 * s, 27.353 * s + oy);
  ctx.lineTo(23.1527 * s, 27.353 * s + oy);
  ctx.closePath();
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const canvas = new OffscreenCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');
const startTime = performance.now();
let lastSentHex = '';

function drawFrame() {
  const elapsed = performance.now() - startTime;

  // 计算当前颜色阶段
  const cycleDuration = COLOR_DURATION + TRANSITION_DURATION;
  const totalCycle = elapsed % (cycleDuration * COLORS.length);
  const colorIndex = Math.floor(totalCycle / cycleDuration) % COLORS.length;
  const phaseInCycle = totalCycle - colorIndex * cycleDuration;

  let fillColor;
  if (phaseInCycle < COLOR_DURATION) {
    fillColor = COLORS[colorIndex];
  } else {
    const nextIndex = (colorIndex + 1) % COLORS.length;
    const progress = (phaseInCycle - COLOR_DURATION) / TRANSITION_DURATION;
    const eased = (1 - Math.cos(progress * Math.PI)) / 2;
    const c1 = hexToRgb(COLORS[colorIndex]);
    const c2 = hexToRgb(COLORS[nextIndex]);
    const [r, g, b] = lerpColor(c1, c2, eased);
    fillColor = rgbToHex(r, g, b);
  }

  // 非过渡期间且颜色没变，跳过重绘
  if (phaseInCycle >= COLOR_DURATION || fillColor !== lastSentHex) {
    lastSentHex = fillColor;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // 绘制云朵背景
    drawCloudPath(ctx);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // 绘制文字/图案
    drawMarkPath(ctx);
    ctx.fillStyle = '#3A3A3A';
    ctx.fill();

    // 导出并通知主线程
    canvas.convertToBlob({ type: 'image/png' }).then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        self.postMessage({ type: 'updateFavicon', dataUrl: reader.result });
      };
      reader.readAsDataURL(blob);
    });
  }
}

// 30fps，使用 setInterval 确保后台不被节流
self.onmessage = (e) => {
  if (e.data.type === 'start') {
    setInterval(drawFrame, 33);
  }
};
