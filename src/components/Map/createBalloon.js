const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';

function getWrappedText(text, maxWidth, svg) {
  maxWidth = maxWidth || 150;

  const words = text.split(' ');
  let lines = [''];
  let lineIndex = 0;
  let currentLineLength = 0;

  words.forEach(word => {
    // work out its bounding box
    const textElement = svg
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .text(word + ' ');
    const box = textElement.node().getBBox();
    textElement.remove();

    if (currentLineLength + box.width > maxWidth) {
      lines.push('');
      lineIndex++;
      currentLineLength = 0;
    }

    lines[lineIndex] += word + ' ';
    currentLineLength += box.width;
  });

  return lines;
}

export default function createBalloon({ text, x, y, parentGroup, svg, onClick, zoom }) {
  // create a new group on the given group
  const balloon = parentGroup.append('g').attr('class', 'popup').attr('fill', 'white');

  const lines = getWrappedText(text, 145, svg);
  const width = 190;
  const height = 30 + lines.length * 20;

  balloon
    .append('rect')
    .attr('fill', 'white')
    .attr('x', 0)
    .attr('y', 0)
    .attr('rx', 3)
    .attr('ry', 3)
    .attr('width', width)
    .attr('height', height - 5)
    .attr('stroke', 'rgba(0,0,0,0.3)')
    .style('strock-width', 1);

  balloon
    .append('polygon')
    .attr('points', '0,0 8,10, 16,0')
    .attr('transform', `translate(90, ${height - 5})`)
    .attr('stroke', 'rgba(0,0,0,0.3)')
    .style('strock-width', 1);
  balloon
    .append('polygon')
    .attr('points', '0,0 8,10, 16,0')
    .attr('transform', `translate(90, ${height - 6})`)
    .attr('stroke', 'white')
    .style('strock-width', 1);

  lines.forEach((line, index) => {
    balloon
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('fill', '#222')
      .attr('text-anchor', 'start')
      .attr('x', 15)
      .attr('y', 25 + index * 20)
      .text(line);
  });

  balloon
    .append('text')
    .attr('font-size', 14)
    .attr('font-family', SANS_SERIF_FONT)
    .attr('font-weight', 'bold')
    .attr('fill', '#999')
    .attr('text-anchor', 'end')
    .attr('x', width - 7)
    .attr('dy', 7)
    .attr('y', 7)
    .text('x')
    .style('cursor', 'pointer');

  balloon.on('click', onClick);

  const factor = 1 / zoom;
  balloon.attr('transform', `translate(${x - (width / 2) * factor}, ${y - height * factor - 2}) scale(${factor})`);
  balloon.props = { x, y, width, height };

  return balloon;
}
