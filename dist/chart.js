/*
 * Minimal Chart implementation for the Mis Finanzas Posta desktop application.
 *
 * This lightweight module emulates a tiny subset of the Chart.js API used by
 * the original web application. It supports simple line and bar charts on
 * an HTML canvas element. Only the features required by the app are
 * implemented: line charts with optional area fill and bar charts drawn
 * horizontally. The API mirrors Chart.js enough that existing calls such as
 * `new Chart(ctx, { type: 'line', data: ..., options: ... })` continue to
 * work without modification. A `destroy()` method is provided to clear the
 * canvas between redraws.
 */

(function () {
  class SimpleChart {
    constructor(ctx, config) {
      this.ctx = ctx;
      this.config = config;
      this.canvas = ctx.canvas;
      // Normalize canvas dimensions: use explicit width/height attributes if set,
      // otherwise fall back to client dimensions.
      this.canvas.width = this.canvas.width || this.canvas.clientWidth;
      this.canvas.height = this.canvas.height || this.canvas.clientHeight;
      this.draw();
    }

    /**
     * Clear the entire canvas.
     */
    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Destroys the chart by clearing the canvas. Included for API compatibility
     * with Chart.js.
     */
    destroy() {
      this.clear();
    }

    /**
     * Dispatch drawing based on chart type.
     */
    draw() {
      this.clear();
      const { type, data, options } = this.config;
      if (type === 'line') {
        this.drawLineChart(data, options);
      } else if (type === 'bar') {
        this.drawBarChart(data, options);
      }
    }

    /**
     * Draw a simple line chart with optional filled area. Supports multiple
     * datasets. Axes, ticks and a legend are rendered. Colour options
     * propagate from the supplied options object when present, otherwise
     * sensible defaults are used.
     *
     * @param {Object} data Chart data containing labels and datasets.
     * @param {Object} options Configuration options for axes and legend.
     */
    drawLineChart(data, options) {
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      const labels = data.labels || [];
      const datasets = data.datasets || [];
      if (!datasets.length || !labels.length) return;

      // Determine the data range across all datasets.
      let max = -Infinity;
      let min = Infinity;
      datasets.forEach((ds) => {
        ds.data.forEach((v) => {
          const val = Number(v);
          if (val > max) max = val;
          if (val < min) min = val;
        });
      });
      // Anchor the minimum at zero for a more intuitive baseline.
      if (min > 0) min = 0;

      // Layout constants. Provide padding for axes and labels.
      const xPadding = 50;
      const yPadding = 30;
      const plotWidth = width - xPadding * 2;
      const plotHeight = height - yPadding * 2;

      // Determine styling colours from options, falling back to defaults.
      const axisColor =
        (options?.scales?.x?.ticks?.color || options?.scales?.y?.ticks?.color) ||
        '#666';
      const labelColor = options?.plugins?.legend?.labels?.color || '#000';

      // Draw axes.
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // y-axis line
      ctx.moveTo(xPadding, yPadding);
      ctx.lineTo(xPadding, height - yPadding);
      // x-axis line
      ctx.lineTo(width - xPadding, height - yPadding);
      ctx.stroke();

      // Draw x-axis labels evenly spaced.
      ctx.font = '12px sans-serif';
      ctx.fillStyle = axisColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : plotWidth;
      labels.forEach((label, i) => {
        const x = xPadding + stepX * i;
        ctx.fillText(String(label), x, height - yPadding + 4);
      });

      // Draw y-axis ticks and labels.
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const tickCount = 5;
      const tickStep = (max - min) / tickCount;
      for (let i = 0; i <= tickCount; i++) {
        const yVal = min + tickStep * i;
        const y =
          height -
          yPadding -
          ((yVal - min) / (max - min || 1)) * plotHeight;
        // Tick mark
        ctx.beginPath();
        ctx.moveTo(xPadding - 4, y);
        ctx.lineTo(xPadding, y);
        ctx.stroke();
        // Label
        ctx.fillText(yVal.toFixed(0), xPadding - 6, y);
      }

      // Draw each dataset: line and optional filled area.
      datasets.forEach((ds) => {
        const borderColor = ds.borderColor || '#000';
        const bgColor = ds.backgroundColor || 'rgba(0, 0, 0, 0.1)';
        const fill = ds.fill;
        ctx.strokeStyle = borderColor;
        ctx.fillStyle = bgColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ds.data.forEach((val, i) => {
          const x = xPadding + stepX * i;
          const y =
            height -
            yPadding -
            ((Number(val) - min) / (max - min || 1)) * plotHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Fill the area under the line if requested.
        if (fill) {
          ctx.lineTo(xPadding + stepX * (ds.data.length - 1), height - yPadding);
          ctx.lineTo(xPadding, height - yPadding);
          ctx.closePath();
          // Use semi-opaque fill for better contrast.
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw a simple legend. Each dataset is represented with a coloured box
      // followed by its label. The legend is drawn in the top right corner.
      const legendX = width - xPadding - 100;
      let legendY = yPadding;
      datasets.forEach((ds) => {
        const color = ds.borderColor || '#000';
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY, 12, 12);
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(ds.label || '', legendX + 16, legendY + 6);
        legendY += 18;
      });
    }

    /**
     * Draw a horizontal bar chart. Only the first dataset is used since the
     * original app renders one dataset per bar chart. Bars are scaled
     * relative to the maximum value and labels/values are printed next to
     * each bar. Colours and tick styling follow the provided options.
     *
     * @param {Object} data Chart data containing labels and datasets.
     * @param {Object} options Configuration options for axes and legend.
     */
    drawBarChart(data, options) {
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      const labels = data.labels || [];
      const dataset = data.datasets?.[0] || { data: [], backgroundColor: '#888' };
      const values = dataset.data || [];
      if (!labels.length || !values.length) return;
      const barColor = dataset.backgroundColor || '#888';
      const labelColor =
        (options?.scales?.y?.ticks?.color || options?.scales?.x?.ticks?.color) ||
        '#000';

      // Determine the maximum value to normalise bar widths.
      let max = Math.max(...values.map((v) => Number(v)), 1);
      const topPadding = 20;
      const leftLabelWidth = 100;
      const rightPadding = 20;
      const availableWidth = width - leftLabelWidth - rightPadding;
      const barHeight = (height - topPadding * 2) / labels.length;

      ctx.font = '12px sans-serif';
      labels.forEach((label, i) => {
        const val = Number(values[i]);
        const barWidth = (availableWidth * val) / max;
        const y = topPadding + i * barHeight;
        // Draw background bar for context
        ctx.fillStyle = '#e5e5e5';
        ctx.fillRect(leftLabelWidth, y + barHeight * 0.25, availableWidth, barHeight * 0.5);
        // Draw the value bar
        ctx.fillStyle = barColor;
        ctx.fillRect(leftLabelWidth, y + barHeight * 0.25, barWidth, barHeight * 0.5);
        // Draw the label on the left
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label), leftLabelWidth - 6, y + barHeight * 0.5);
        // Draw the numeric value next to the bar
        ctx.textAlign = 'left';
        ctx.fillText(val.toFixed(0), leftLabelWidth + barWidth + 4, y + barHeight * 0.5);
      });
    }
  }

  // Expose the class globally to mimic the Chart.js API.
  window.Chart = SimpleChart;
})();