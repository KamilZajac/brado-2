let originalTooltipCallbacks: any = null;

export const annotationTooltipPlugin = {
  id: 'annotationTooltip',
  afterEvent(chart: any, args: any) {
    const {event} = args;
    const x = event.x;
    const y = event.y;

    const annotations = chart.options.plugins.annotation?.annotations;
    if (!annotations) return;

    const found = Object.values(annotations).find((ann: any) => {
      if (ann.type !== 'line') return false;

      const xScale = chart.scales[ann.xScaleID || 'x'];
      const yScale = chart.scales[ann.yScaleID || 'y'];
      if (!xScale || !yScale) return false;

      // Convert data coordinates to pixel positions
      const xMinPx = xScale.getPixelForValue(ann.xMin);
      const xMaxPx = xScale.getPixelForValue(ann.xMax);
      const yPx = yScale.getPixelForValue(ann.yMin); // horizontal line

      // Add debug logs
      // console.log(`Checking annotation: x=${x}, y=${y}, lineX=${xMinPx}-${xMaxPx}, lineY=${yPx}`);

      const inXRange = x <= xMinPx && x >= xMaxPx;

      const closeToY = Math.abs(y - yPx) < 5;

      return inXRange && closeToY;
    });

    const tooltip = chart.tooltip;

    // console.log(found)
    if (found) {
      const tooltipData = (found as any).tooltipData || {};
      chart._active = []; // prevent default tooltip

      if (!tooltip.options.callbacks) {
        tooltip.options.callbacks = {};
      }
      tooltip.options.callbacks.title = () => [tooltipData.title || ''];
      tooltip.options.callbacks.label = () => tooltipData.text || '';
      tooltip.setActiveElements(
        [{
          datasetIndex: 0,
          index: 0
        }],
        {x, y}
      );


      tooltip.update(true);
    } else {
      // tooltip.options.callbacks.title = () => [tooltipData.title || ''];
      // tooltip.options.callbacks.label = () => '';

      // tooltip.setActiveElements([], {x: 0, y: 0});
      // tooltip.update(true);
    }
  }
};
