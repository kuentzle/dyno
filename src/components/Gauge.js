import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
export function Gauge({ value, maxValue, title, unit, color }) {
    const scaleMax = useMemo(() => {
        const peak = Math.max(maxValue, 10);
        if (peak <= 10)
            return 10;
        if (peak <= 20)
            return 20;
        if (peak <= 50)
            return 50;
        if (peak <= 100)
            return 100;
        if (peak <= 250)
            return 250;
        if (peak <= 500)
            return 500;
        if (peak <= 1000)
            return 1000;
        const pow = Math.pow(10, Math.floor(Math.log10(peak)));
        return Math.ceil(peak / pow) * pow;
    }, [maxValue]);
    const size = 150;
    const strokeWidth = 8;
    const center = size / 2;
    const radius = center - strokeWidth - 2;
    const startAngle = 135;
    const endAngle = 405;
    const totalAngle = endAngle - startAngle;
    const polarToCartesian = (cx, cy, r, deg) => {
        const rad = (deg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };
    const describeArc = (x, y, r, s, e) => {
        const start = polarToCartesian(x, y, r, e);
        const end = polarToCartesian(x, y, r, s);
        const large = e - s <= 180 ? '0' : '1';
        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
    };
    // Number of major ticks (aim for 5 divisions)
    const tickCount = 5;
    const tickStep = scaleMax / tickCount;
    const ticks = useMemo(() => {
        const result = [];
        for (let i = 0; i <= tickCount; i++) {
            const val = i * tickStep;
            const angle = startAngle + (val / scaleMax) * totalAngle;
            const outer = polarToCartesian(center, center, radius + 2, angle);
            const inner = polarToCartesian(center, center, radius - 10, angle);
            const label = polarToCartesian(center, center, radius - 18, angle);
            result.push({ val, angle, outer, inner, label });
        }
        return result;
    }, [scaleMax, tickStep, center, radius, totalAngle]);
    const clampedValue = Math.min(value, scaleMax);
    const valueAngle = startAngle + (clampedValue / scaleMax) * totalAngle;
    const peakAngle = startAngle + (Math.min(maxValue, scaleMax) / scaleMax) * totalAngle;
    const needleEnd = polarToCartesian(center, center, radius - 14, valueAngle);
    const peakOuter = polarToCartesian(center, center, radius + 2, peakAngle);
    const peakInner = polarToCartesian(center, center, radius - 12, peakAngle);
    const bgArc = describeArc(center, center, radius, startAngle, endAngle);
    const valArc = clampedValue > 0 ? describeArc(center, center, radius, startAngle, valueAngle) : '';
    return (_jsxs("div", { className: "flex flex-col items-center", style: { width: size }, children: [_jsx("div", { className: "text-[10px] font-bold tracking-widest text-gray-400 mb-1 uppercase", children: title }), _jsxs("div", { className: "relative", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, children: [_jsx("path", { d: bgArc, fill: "none", stroke: "#222", strokeWidth: strokeWidth, strokeLinecap: "round" }), valArc && (_jsx("path", { d: valArc, fill: "none", stroke: color, strokeWidth: strokeWidth, strokeLinecap: "round", style: { filter: `drop-shadow(0 0 6px ${color})` } })), ticks.map((t, i) => (_jsxs("g", { children: [_jsx("line", { x1: t.outer.x, y1: t.outer.y, x2: t.inner.x, y2: t.inner.y, stroke: "#555", strokeWidth: i === 0 || i === tickCount ? 2 : 1 }), _jsx("text", { x: t.label.x, y: t.label.y, fill: "#666", fontSize: "8", fontWeight: "bold", textAnchor: "middle", dominantBaseline: "central", children: Math.round(t.val) })] }, i))), maxValue > 0 && (_jsx("line", { x1: peakOuter.x, y1: peakOuter.y, x2: peakInner.x, y2: peakInner.y, stroke: "#ff0055", strokeWidth: 2.5, strokeLinecap: "round", style: { filter: 'drop-shadow(0 0 4px #ff0055)' } })), _jsx("line", { x1: center, y1: center, x2: needleEnd.x, y2: needleEnd.y, stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }), _jsx("circle", { cx: center, cy: center, r: 4, fill: "#fff" }), _jsx("circle", { cx: center, cy: center, r: 2, fill: color })] }), _jsxs("div", { className: "absolute inset-x-0 bottom-2 flex flex-col items-center pointer-events-none", children: [_jsx("span", { className: "text-2xl font-mono font-bold", style: { color, textShadow: `0 0 8px ${color}60` }, children: Math.round(value) }), _jsx("span", { className: "text-[9px] text-gray-500 font-bold uppercase -mt-1", children: unit })] })] })] }));
}
