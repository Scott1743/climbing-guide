'use strict';
importScripts('route-solver.js'+self.location.search);
self.onmessage=event=>{
 try { self.postMessage({result:self.ClimbingSolver.solve(event.data.input)}); }
 catch { self.postMessage({error:'计算未完成，请检查点位和尺寸后重试。'}); }
};
