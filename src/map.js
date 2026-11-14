import { areas } from './store.js';

const zones = [
  { x: 0, y: 0, w: 4, d: 3, h: 1.6, name: areas[0], color: '#d5fa64' },
  { x: 5, y: 0, w: 2.4, d: 3, h: 1.05, name: areas[1], color: '#7accc3' },
  { x: 0, y: 4, w: 4, d: 2, h: .75, name: areas[2], color: '#eead74' },
  { x: 5, y: 4, w: 2.4, d: 2, h: 1.25, name: areas[3], color: '#8eaaff' }
];

export function mountMap(canvas, angle, selected, orders, selectArea) {
  let hits = [];
  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const scale = Math.min((width - 28) / 12.4, (height - 24) / 7.8);
    const turn = angle * Math.PI / 180;
    const sin = Math.sin(turn);
    const cos = Math.cos(turn);
    const project = ([x, y, z = 0]) => {
      x -= 3.7;
      y -= 3;
      return [width / 2 + (x * cos - y * sin) * scale, height * .56 + ((x * sin + y * cos) * .52 - z) * scale];
    };
    function polygon(points, fill, stroke) {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    const floor = [[-1,-1], [8.4,-1], [8.4,7], [-1,7]];
    polygon(floor.map(project), '#171b1e', '#353d40');
    for (let x = -1; x <= 8; x += .5) {
      const a = project([x,-1]), b = project([x,7]);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.strokeStyle = '#242b2e'; ctx.stroke();
    }
    for (let y = -1; y <= 7; y += .5) {
      const a = project([-1,y]), b = project([8.4,y]);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.strokeStyle = '#242b2e'; ctx.stroke();
    }
    hits = [];
    const depth = (x, y) => x * sin + y * cos;
    for (const zone of [...zones].sort((a, b) => depth(a.x+a.w/2,a.y+a.d/2)-depth(b.x+b.w/2,b.y+b.d/2))) {
      const {x,y,w,d,h,name,color} = zone;
      const corners = [[x,y], [x+w,y], [x+w,y+d], [x,y+d]];
      const roof = corners.map(([a,b]) => project([a,b,h]));
      const base = corners.map(project);
      const fill = name === selected ? '#43502b' : '#293035';
      const edge = name === selected ? color : '#526065';
      const faces = [0,1,2,3].filter(i => {
        const j = (i+1)%4;
        return (roof[j][0]-roof[i][0]) < 0;
      });
      for (const i of faces) {
        const j = (i+1)%4;
        polygon([roof[i],roof[j],base[j],base[i]], i%2 ? '#202729' : '#171e21', edge);
      }
      polygon(roof, fill, edge);
      const point = project([x+w/2,y+d/2,h]);
      hits.push({ point, name });
      const active = orders.filter(order => order.area===name && order.status!=='Concluída').length;
      ctx.fillStyle = '#111618';
      ctx.beginPath(); ctx.arc(point[0],point[1]-4,12,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=1.5;ctx.strokeStyle=color;ctx.stroke();ctx.lineWidth=1;
      ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
      ctx.fillText(active,point[0],point[1]-3);
    }
  }
  canvas.onclick = event => {
    const bounds = canvas.getBoundingClientRect();
    const hit = [...hits].reverse().find(({point})=>Math.hypot(point[0]-(event.clientX-bounds.left),point[1]-(event.clientY-bounds.top)) < 23);
    if (hit) selectArea(hit.name);
  };
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);
  draw();
  return () => observer.disconnect();
}
