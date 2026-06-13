const { createCanvas } = require('@napi-rs/canvas');

function generateStockChart(history, currentTrend, isUp = currentTrend >= 0) {
    const W = 900, H = 350;
    const pad = { top: 30, right: 25, bottom: 45, left: 80 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const prices = history;
    if (prices.length < 2) {
        ctx.fillStyle = '#6e7681';
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Gathering data...', W / 2, H / 2);
        return canvas.toBuffer('image/png');
    }

    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangePad = (maxP - minP) * 0.12 || 5;
    const lo = minP - rangePad;
    const hi = maxP + rangePad;
    const range = hi - lo;

    const toX = i => pad.left + (i / (prices.length - 1)) * cw;
    const toY = p => pad.top + ch - ((p - lo) / range) * ch;

    const lineColor = isUp ? '#3ddc84' : '#ff5252';

    // Grid lines
    ctx.strokeStyle = '#1e2736';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = pad.top + (ch / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + cw, y);
        ctx.stroke();
    }

    // Vertical grid lines (every ~10 data points)
    const vStep = Math.max(1, Math.floor(prices.length / 6));
    for (let i = 0; i < prices.length; i += vStep) {
        ctx.beginPath();
        ctx.moveTo(toX(i), pad.top);
        ctx.lineTo(toX(i), pad.top + ch);
        ctx.stroke();
    }

    // Y-axis price labels
    ctx.fillStyle = '#6e7681';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
        const p = hi - (range / gridLines) * i;
        const y = pad.top + (ch / gridLines) * i;
        ctx.fillText(Math.round(p).toLocaleString(), pad.left - 8, y + 4);
    }

    // Gradient fill under the line
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, isUp ? 'rgba(61,220,132,0.22)' : 'rgba(255,82,82,0.22)');
    grad.addColorStop(1, 'rgba(13,17,23,0)');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
        ctx.lineTo(toX(i), toY(prices[i]));
    }
    ctx.lineTo(toX(prices.length - 1), pad.top + ch);
    ctx.lineTo(toX(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Main price line (with glow)
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(prices[0]));
    for (let i = 1; i < prices.length; i++) {
        ctx.lineTo(toX(i), toY(prices[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current price dot
    const lx = toX(prices.length - 1);
    const ly = toY(prices[prices.length - 1]);
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    // Axis border
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left, pad.top, cw, ch);

    return canvas.toBuffer('image/png');
}

module.exports = { generateStockChart };
