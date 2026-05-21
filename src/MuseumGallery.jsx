import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

:root {
  --bg: #0f0c19;
  --surface: rgba(18,14,30,0.97);
  --glass: rgba(255,255,255,0.05);
  --glass-b: rgba(255,255,255,0.1);
  --gold: #d4a849;
  --gold-lt: #f0cc7a;
  --lilac: #c5b8f5;
  --white: #f5f1ff;
  --muted: rgba(245,241,255,0.4);
  --accent: #9b7ef8;
  --sw: 260px;
  --tbh: 50px;
  --ease: cubic-bezier(0.22,1,0.36,1);
}

*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}

.app{
  width:100%;height:100vh;background:var(--bg);
  font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;
  overflow:hidden;position:fixed;inset:0;color:var(--white);
}

/* TOP BAR */
.topbar{
  height:var(--tbh);background:rgba(8,6,15,0.96);
  border-bottom:0.5px solid var(--glass-b);
  display:flex;align-items:center;padding:0 20px;gap:14px;flex-shrink:0;
  backdrop-filter:blur(20px);z-index:100;
}
.logo{
  font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:400;
  letter-spacing:3px;color:var(--gold);margin-right:auto;
  font-style:italic;
}
.room-pill{
  background:var(--glass);border:0.5px solid var(--glass-b);
  border-radius:20px;padding:3px 12px;font-size:10px;font-weight:500;
  letter-spacing:1.5px;color:var(--muted);text-transform:uppercase;
}
.save-badge{
  background:rgba(34,197,94,0.15);border:0.5px solid rgba(34,197,94,0.3);
  border-radius:20px;padding:3px 10px;font-size:10px;font-weight:500;
  color:#86efac;animation:savePop 1.5s var(--ease) forwards;
}
@keyframes savePop{
  0%{opacity:0;transform:scale(0.88)}
  15%{opacity:1;transform:scale(1)}
  70%{opacity:1}
  100%{opacity:0}
}
.topbar-hint{
  font-size:10px;color:var(--muted);letter-spacing:0.5px;
}

/* BODY */
.body{flex:1;display:flex;min-height:0;overflow:hidden;}

/* SIDEBAR */
.sidebar{
  width:var(--sw);background:var(--surface);
  border-right:0.5px solid var(--glass-b);
  display:flex;flex-direction:column;flex-shrink:0;
  transition:width 0.4s var(--ease);position:relative;z-index:50;
  overflow:hidden;
}
.sidebar.collapsed{width:40px;}
.toggle-btn{
  position:absolute;top:10px;right:7px;width:26px;height:26px;
  background:var(--glass);border:0.5px solid var(--glass-b);border-radius:50%;
  color:var(--gold);font-size:11px;cursor:pointer;display:flex;
  align-items:center;justify-content:center;z-index:10;
  transition:background 0.2s;
}
.toggle-btn:hover{background:rgba(212,168,73,0.15);}
.sidebar-inner{
  flex:1;display:flex;flex-direction:column;padding:10px 11px 14px;
  gap:9px;overflow-y:auto;
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.1) transparent;
}

/* TABS */
.tabs{display:flex;gap:4px;background:rgba(0,0,0,0.3);border-radius:10px;padding:3px;}
.tab{
  flex:1;padding:6px 4px;background:transparent;border:none;
  color:var(--muted);font-family:'DM Sans',sans-serif;font-size:10px;
  font-weight:500;cursor:pointer;border-radius:7px;
  letter-spacing:0.5px;transition:all 0.2s;text-transform:uppercase;
}
.tab.active{
  background:rgba(155,126,248,0.2);color:var(--lilac);
  border:0.5px solid rgba(155,126,248,0.3);
}

/* PANEL ELEMENTS */
.panel{display:flex;flex-direction:column;gap:8px;}
.empty-state{
  display:flex;flex-direction:column;align-items:center;
  text-align:center;padding:20px 8px;gap:12px;
}
.empty-icon{font-size:32px;animation:float 3s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.empty-text{font-size:11px;color:var(--muted);line-height:1.7;font-weight:400;}
.hint-chip{
  background:rgba(155,126,248,0.1);border:0.5px solid rgba(155,126,248,0.25);
  border-radius:20px;padding:4px 10px;font-size:9px;font-weight:500;
  color:var(--lilac);letter-spacing:0.5px;
}
.sec-title{
  font-size:8.5px;font-weight:500;letter-spacing:2.5px;
  text-transform:uppercase;color:var(--gold);opacity:0.8;margin-top:2px;
}

/* LAYER ROW */
.layer-row{display:flex;gap:5px;align-items:center;}
.layer-btn{
  flex:1;padding:6px 4px;font-family:'DM Sans',sans-serif;font-size:9.5px;
  font-weight:500;cursor:pointer;border-radius:7px;
  letter-spacing:0.5px;transition:all 0.2s;border:0.5px solid;
}
.layer-btn.up{background:rgba(74,222,128,0.08);border-color:rgba(74,222,128,0.2);color:#86efac;}
.layer-btn.dn{background:rgba(252,165,165,0.08);border-color:rgba(252,165,165,0.2);color:#fca5a5;}
.layer-btn:hover{transform:translateY(-1px);}
.z-badge{
  font-size:9.5px;font-weight:500;color:var(--muted);
  background:var(--glass);border:0.5px solid var(--glass-b);
  border-radius:6px;padding:3px 7px;white-space:nowrap;
}

/* SHAPE GRID */
.shape-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;}
.shape-btn{
  display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;
  background:var(--glass);border:0.5px solid var(--glass-b);border-radius:7px;
  color:var(--white);cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;
}
.shape-btn:hover{background:rgba(255,255,255,0.09);transform:translateY(-1px);}
.shape-btn.active{background:rgba(155,126,248,0.2);border-color:var(--accent);}
.sb-icon{font-size:13px;}.sb-lbl{font-size:7.5px;font-weight:400;color:var(--muted);}
.shape-btn.active .sb-lbl{color:var(--lilac);}

/* DESIGN GRID */
.design-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;}
.design-btn{
  display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 3px;
  background:var(--glass);border:0.5px solid var(--glass-b);border-radius:7px;
  cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;
  color:var(--muted);font-size:8.5px;font-weight:400;
}
.design-btn:hover{background:rgba(255,255,255,0.09);transform:translateY(-1px);}
.design-btn.active{border-color:var(--gold);background:rgba(212,168,73,0.1);color:var(--gold-lt);}
.dpreview{
  width:34px;height:26px;border-radius:4px;position:relative;
  overflow:hidden;display:flex;align-items:center;justify-content:center;
}
.dpreview-inner{width:55%;height:55%;background:rgba(0,0,0,0.2);border-radius:2px;}
.frame-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}

/* COLORS */
.color-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
.cdot{
  width:22px;height:22px;border-radius:50%;cursor:pointer;
  transition:transform 0.15s,box-shadow 0.15s;border:none;flex-shrink:0;
}
.cdot:hover{transform:scale(1.18);}
.cdot.active{box-shadow:0 0 0 2.5px var(--bg),0 0 0 4px var(--gold-lt),0 0 10px rgba(240,204,122,0.4);transform:scale(1.12);}
.custom-color-wrap{
  width:22px;height:22px;border-radius:50%;
  background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  overflow:hidden;position:relative;flex-shrink:0;transition:transform 0.15s;
}
.custom-color-wrap:hover{transform:scale(1.18);}
.custom-color-wrap input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}

/* SLIDERS */
.size-row{display:flex;flex-direction:column;gap:6px;}
.size-label{display:flex;justify-content:space-between;align-items:center;}
.size-label .slbl{font-size:9.5px;font-weight:400;color:var(--muted);letter-spacing:0.5px;}
.size-label .sval{font-size:10px;font-weight:500;color:var(--gold-lt);}
.slider{
  width:100%;height:3px;-webkit-appearance:none;appearance:none;
  background:linear-gradient(90deg,var(--accent),var(--gold));
  border-radius:3px;outline:none;cursor:pointer;
}
.slider::-webkit-slider-thumb{
  -webkit-appearance:none;width:14px;height:14px;
  background:var(--gold-lt);border-radius:50%;border:2px solid var(--bg);
  cursor:grab;box-shadow:0 0 6px rgba(240,204,122,0.4);
}
.rot-row{display:flex;align-items:center;gap:7px;}
.rot-val{font-size:10px;font-weight:500;color:var(--gold-lt);min-width:30px;text-align:right;}
.rot-reset{
  background:var(--glass);border:0.5px solid var(--glass-b);color:var(--muted);
  border-radius:6px;padding:4px 7px;font-size:12px;cursor:pointer;transition:all 0.15s;
}
.rot-reset:hover{color:var(--white);}

/* INPUTS */
.txt-input{
  background:var(--glass);border:0.5px solid var(--glass-b);border-radius:7px;
  color:var(--white);font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;
  padding:8px 10px;outline:none;transition:border 0.2s;width:100%;
}
.txt-input:focus{border-color:rgba(155,126,248,0.5);}
.txt-input::placeholder{color:var(--muted);}

/* UPLOAD */
.upload-zone{
  display:flex;align-items:center;justify-content:center;
  background:rgba(212,168,73,0.05);border:0.5px dashed rgba(212,168,73,0.3);
  border-radius:7px;padding:10px;cursor:pointer;transition:all 0.2s;
}
.upload-zone:hover{background:rgba(212,168,73,0.1);}
.upload-zone input{display:none;}
.upload-zone span{font-size:10px;font-weight:400;color:var(--gold-lt);letter-spacing:0.5px;}
.clear-img{
  background:rgba(239,68,68,0.07);border:0.5px solid rgba(239,68,68,0.2);
  color:#fca5a5;border-radius:6px;padding:5px 9px;font-size:9.5px;font-weight:400;
  cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;
}
.clear-img:hover{background:rgba(239,68,68,0.14);}

/* ACTION BUTTONS */
.frame-actions{display:flex;gap:6px;margin-top:2px;}
.add-btn{
  flex:1;padding:8px 6px;
  background:rgba(155,126,248,0.12);border:0.5px solid rgba(155,126,248,0.28);
  border-radius:7px;color:var(--lilac);font-family:'DM Sans',sans-serif;
  font-size:10px;font-weight:400;cursor:pointer;transition:all 0.2s;
  letter-spacing:0.5px;
}
.add-btn:hover{background:rgba(155,126,248,0.22);transform:translateY(-1px);}
.del-btn{
  padding:8px 10px;background:rgba(239,68,68,0.08);border:0.5px solid rgba(239,68,68,0.2);
  border-radius:7px;color:#fca5a5;font-family:'DM Sans',sans-serif;
  font-size:10px;cursor:pointer;transition:all 0.2s;
}
.del-btn:hover{background:rgba(239,68,68,0.16);}
.panel-footer{border-top:0.5px solid var(--glass-b);margin:0 -11px -14px;padding:12px;background:rgba(0,0,0,0.15);}

/* FILTER GRID */
.filter-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
.filter-btn{
  display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;
  background:var(--glass);border:0.5px solid var(--glass-b);border-radius:7px;
  cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;
  color:var(--muted);font-size:8px;
}
.filter-btn:hover{background:rgba(255,255,255,0.08);}
.filter-btn.active{border-color:var(--accent);background:rgba(155,126,248,0.1);color:var(--lilac);}
.filter-swatch{width:100%;height:14px;border-radius:3px;opacity:0.8;}

/* CROP MODE HIGH-FIDELITY */
.app.is-cropping .wall-inner {
  filter: grayscale(0.5) contrast(0.9);
  opacity: 0.3;
  transition: all 0.5s ease;
}
.app.is-cropping .frame:not(.cropping-active) {
  pointer-events: none;
}
.app.is-cropping .frame.cropping-active {
  opacity: 1 !important;
  filter: none !important;
  pointer-events: auto !important;
}

.crop-ghost-container {
  position: absolute;
  inset: 0; /* Match frame size exactly */
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: -1;
  opacity: 0;
  overflow: visible; /* CRITICAL: Show the rest of the photo */
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.cropping-active .crop-ghost-container {
  opacity: 0.45;
}
.crop-ghost {
  position: absolute;
  top: 50%;
  left: 50%;
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  filter: blur(1.5px);
  /* The transform in JSX must include translate(-50%, -50%) */
}

.crop-grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  z-index: 5;
  transition: opacity 0.5s ease 0.2s;
}
.cropping-active .crop-grid-overlay {
  opacity: 0.6;
}
.grid-line {
  position: absolute;
  background: rgba(255,255,255,0.8);
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}
.grid-line.v { width: 0.5px; height: 100%; }
.grid-line.h { height: 0.5px; width: 100%; }

.crop-controls-hint {
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
  pointer-events: auto;
  animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1100;
}
@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.crop-done-btn {
  background: var(--gold);
  color: #000;
  border: none;
  padding: 8px 24px;
  border-radius: 24px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(212,168,73,0.5), 0 0 0 4px rgba(212,168,73,0.2);
  transition: all 0.2s;
}
.crop-done-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 25px rgba(212,168,73,0.6), 0 0 0 6px rgba(212,168,73,0.2);
}

.cropping-active {
  animation: cropPulse 2s infinite alternate;
  outline: 2000px solid rgba(0,0,0,0.4) !important; /* Cinematic Focus */
}
@keyframes cropPulse {
  from { box-shadow: 0 0 30px var(--gold), 0 20px 60px rgba(0,0,0,0.9); }
  to { box-shadow: 0 0 50px var(--gold), 0 20px 80px rgba(0,0,0,1); }
}

.history-controls {
  display: flex;
  gap: 8px;
  margin-right: 12px;
  padding-right: 12px;
  border-right: 1px solid var(--glass-b);
}
.hist-btn {
  background: var(--glass);
  border: 1px solid var(--glass-b);
  color: var(--muted);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}
.hist-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
  color: white;
  border-color: rgba(255,255,255,0.2);
}
.hist-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* WALLPAPER GRID */
.wp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.wp-btn{
  height:42px;border-radius:8px;border:2px solid transparent;
  cursor:pointer;position:relative;transition:transform 0.2s,border-color 0.2s;overflow:hidden;
}
.wp-btn:hover{transform:scale(1.06);}
.wp-btn.active{border-color:var(--gold-lt);box-shadow:0 0 14px rgba(212,168,73,0.35);}
.wp-check{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,0.28);font-size:14px;
}
.color-swatches{display:flex;flex-wrap:wrap;gap:5px;}
.swatch{
  width:26px;height:26px;border-radius:50%;border:2px solid transparent;
  cursor:pointer;transition:transform 0.15s,border-color 0.15s;
}
.swatch:hover{transform:scale(1.15);}
.swatch.active{border-color:var(--gold-lt);}
.color-picker-full{
  width:100%;height:34px;border-radius:7px;
  border:0.5px solid var(--glass-b);cursor:pointer;background:none;padding:2px;
}

/* GALLERY MAIN */
.gallery{flex:1;display:flex;flex-direction:column;min-width:0;position:relative;}
.scroll-area{
  flex:1;display:flex;overflow-x:auto;overflow-y:hidden;
  scroll-snap-type:x mandatory;scrollbar-width:none;
}
.scroll-area::-webkit-scrollbar{display:none;}

/* WALL */
.wall{
  flex-shrink:0;width:220vw;height:100%;scroll-snap-align:start;
  position:relative;display:flex;flex-direction:column;
}
.wallpaper-bg{
  position:absolute;inset:0;z-index:0;pointer-events:none;
}
.wall-inner{flex:1;position:relative;overflow:hidden;}
.wall::after{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:1;
  box-shadow:inset 0 0 80px rgba(0,0,0,0.18),inset 0 -100px 80px rgba(0,0,0,0.12);
}
.spotlight{
  position:absolute;top:0;width:10%;height:72%;
  background:radial-gradient(ellipse at top,rgba(255,245,210,0.1) 0%,transparent 70%);
  pointer-events:none;z-index:1;transition:opacity 1.5s;
}

/* FRAMES */
.frame{position:absolute;touch-action:none;user-select:none;will-change:transform;}
.frame.selected{cursor:grab;}
.frame.selected:active{cursor:grabbing;}
.frame:not(.selected):hover .ph-plus{opacity:1;}

/* resize handles */
.rhandle{
  position:absolute;width:12px;height:12px;background:var(--gold-lt);
  border:2px solid var(--bg);border-radius:2px;z-index:300;
  box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:transform 0.1s;
}
.rhandle:hover{transform:scale(1.3);}
.rot-handle{
  position:absolute;top:-30px;left:50%;transform:translateX(-50%);
  width:22px;height:22px;
  background:var(--accent);
  border:2px solid var(--bg);border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:11px;cursor:grab;z-index:300;
  box-shadow:0 3px 10px rgba(0,0,0,0.5);color:white;
  transition:transform 0.1s;
}
.rot-handle:hover{transform:translateX(-50%) scale(1.2);}
.rot-handle:active{cursor:grabbing;}

/* frame inner */
.frame-inner{
  width:100%;height:100%;overflow:hidden;position:relative;
  display:flex;align-items:center;justify-content:center;
}
.frame-inner img{width:100%;height:100%;object-fit:cover;display:block;}

/* shapes */
.shape-circle{border-radius:50% !important;}
.shape-circle .frame-inner,.shape-circle .frame-overlay{border-radius:50%;overflow:hidden;}
.shape-oval{border-radius:50% / 60% !important;}
.shape-oval .frame-inner,.shape-oval .frame-overlay{border-radius:50% / 60%;overflow:hidden;}
.shape-arch{border-radius:50% 50% 0 0 / 40% 40% 0 0 !important;}
.shape-arch .frame-inner,.shape-arch .frame-overlay{border-radius:50% 50% 0 0 / 40% 40% 0 0;overflow:hidden;}

/* placeholder */
.placeholder{
  width:100%;height:100%;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
}
.ph-plus{
  width:30px;height:30px;border-radius:50%;border:1.5px dashed rgba(255,255,255,0.25);
  display:flex;align-items:center;justify-content:center;
  font-size:18px;color:rgba(255,255,255,0.3);
  transition:opacity 0.2s;
}
.ph-label{font-size:8.5px;color:rgba(255,255,255,0.3);font-weight:400;letter-spacing:0.5px;}

/* plaque */
.plaque{
  position:absolute;bottom:-24px;left:50%;transform:translateX(-50%);
  background:rgba(10,7,18,0.9);border:0.5px solid rgba(212,168,73,0.25);
  padding:2px 9px;border-radius:5px;white-space:nowrap;
  font-family:'Cormorant Garamond',serif;font-size:9.5px;font-weight:400;
  font-style:italic;color:var(--gold-lt);letter-spacing:0.5px;pointer-events:none;
  box-shadow:0 2px 8px rgba(0,0,0,0.4);
}

/* selection outline */
.sel-outline{
  position:absolute;inset:-6px;border:1.5px dashed rgba(212,168,73,0.7);
  border-radius:inherit;pointer-events:none;z-index:1;
  animation:selPulse 2s ease-in-out infinite;
}
@keyframes selPulse{0%,100%{opacity:0.7}50%{opacity:1}}

/* FLOOR */
.floor{
  height:58px;flex-shrink:0;
  background:linear-gradient(180deg,#0e0903,#080602);
  border-top:2px solid rgba(180,145,60,0.3);
  position:relative;z-index:5;display:flex;align-items:center;justify-content:center;
}
.floor-boards{
  position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,0.012) 0,rgba(255,255,255,0.012) 1px,transparent 1px,transparent 80px);
}
.floor-name{
  font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:5px;
  color:rgba(180,145,60,0.35);z-index:1;font-style:italic;
}

/* DOTS NAV */
.dots-nav{
  height:38px;background:rgba(8,6,15,0.95);border-top:0.5px solid var(--glass-b);
  display:flex;align-items:center;justify-content:center;gap:8px;
  backdrop-filter:blur(12px);
}
.dot{
  width:7px;height:7px;border-radius:50%;
  background:rgba(212,168,73,0.18);border:1px solid rgba(212,168,73,0.25);
  cursor:pointer;transition:all 0.3s var(--ease);
}
.dot.active{background:var(--gold);width:20px;border-radius:4px;border-color:var(--gold);}

/* ADD WALL */
.add-wall{
  flex-shrink:0;width:100px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:8px;
  background:rgba(255,255,255,0.02);border-left:1px dashed rgba(255,255,255,0.08);
  cursor:pointer;transition:background 0.2s;
}
.add-wall:hover{background:rgba(155,126,248,0.05);}
.add-circle{
  width:44px;height:44px;border-radius:50%;border:1.5px dashed rgba(255,255,255,0.15);
  display:flex;align-items:center;justify-content:center;font-size:22px;
  color:rgba(255,255,255,0.2);transition:all 0.25s var(--ease);
}
.add-wall:hover .add-circle{border-color:var(--accent);color:var(--accent);}
.add-wall span{font-size:9px;font-weight:400;letter-spacing:2px;color:rgba(255,255,255,0.18);}

/* MODAL */
.modal-overlay{
  position:fixed;inset:0;z-index:2500;background:rgba(0,0,0,0.85);
  display:flex;align-items:center;justify-content:center;
  animation:fadeIn 0.2s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{
  background:rgba(14,10,26,0.98);border:0.5px solid var(--glass-b);
  border-radius:16px;padding:24px;width:360px;
  display:flex;flex-direction:column;gap:12px;
  box-shadow:0 24px 60px rgba(0,0,0,0.7);
  animation:modalIn 0.3s var(--ease);
}
@keyframes modalIn{from{opacity:0;transform:scale(0.94) translateY(8px)}to{opacity:1;transform:none}}
.modal-title{
  font-family:'Cormorant Garamond',serif;font-size:20px;
  font-weight:400;color:var(--gold-lt);letter-spacing:1px;
}
.modal-label{
  font-size:9px;font-weight:500;letter-spacing:2px;
  text-transform:uppercase;color:var(--muted);
}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px;}
.cancel-btn{
  background:var(--glass);border:0.5px solid var(--glass-b);color:var(--muted);
  border-radius:7px;padding:8px 16px;font-family:'DM Sans',sans-serif;
  font-size:11px;font-weight:400;cursor:pointer;transition:all 0.2s;
}
.cancel-btn:hover{background:rgba(255,255,255,0.08);}
.create-btn{
  background:rgba(155,126,248,0.2);border:0.5px solid rgba(155,126,248,0.4);
  color:var(--lilac);border-radius:7px;padding:8px 18px;
  font-family:'DM Sans',sans-serif;font-size:11px;font-weight:400;
  cursor:pointer;transition:all 0.2s;letter-spacing:0.5px;
}
.create-btn:hover{background:rgba(155,126,248,0.3);transform:translateY(-1px);}

/* FILTER PICKER */
.filter-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;}
.filter-btn{
  display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;
  background:var(--glass);border:0.5px solid var(--glass-b);border-radius:6px;
  cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;
  color:var(--muted);font-size:8px;font-weight:400;
}
.filter-btn.active{border-color:var(--accent);background:rgba(155,126,248,0.15);color:var(--lilac);}
.filter-btn:hover{background:rgba(255,255,255,0.08);}
.filter-swatch{width:30px;height:22px;border-radius:4px;}

/* Align guides */
.align-guide{
  position:absolute;background:rgba(155,126,248,0.6);pointer-events:none;z-index:500;
}
.align-guide.h{height:1px;left:0;right:0;}
.align-guide.v{width:1px;top:0;bottom:0;}

/* LIGHTBOX */
.lightbox{
  position:fixed;inset:0;z-index:3000;background:rgba(4,2,10,0.97);
  display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:16px;padding:40px;
  animation:fadeIn 0.25s ease;
}
.lightbox img{
  max-width:86%;max-height:76vh;object-fit:contain;
  border:1px solid rgba(212,168,73,0.3);border-radius:4px;
  box-shadow:0 0 80px rgba(212,168,73,0.12);
  animation:lbPop 0.35s var(--ease);
}
@keyframes lbPop{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
.lb-close{
  position:absolute;top:24px;right:32px;font-size:22px;color:var(--gold);
  background:none;border:none;cursor:pointer;transition:transform 0.2s;opacity:0.7;
}
.lb-close:hover{opacity:1;transform:rotate(90deg);}
.lb-caption{
  font-family:'Cormorant Garamond',serif;font-size:16px;
  letter-spacing:3px;color:var(--gold-lt);font-style:italic;opacity:0.8;
}

/* HOLD RING */
.hold-ring-container {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hold-ring {
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 4px var(--gold));
}
.hold-ring circle {
  fill: none;
  stroke: var(--gold-lt);
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear, opacity 0.2s;
}

/* EDIT CONFIRM PULSE */
.edit-confirm-pulse {
  animation: editPulse 0.6s var(--ease) forwards;
}
@keyframes editPulse {
  0% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 0 transparent); }
  30% { transform: scale(1.04); filter: brightness(1.3) drop-shadow(0 0 15px var(--gold)); }
  100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 0 transparent); }
}
`;

// ─────────────────── WALLPAPERS ───────────────────
const WALLPAPERS = [
  { id: "ivory-linen", label: "Ivory Linen", style: { backgroundColor: "#f5eedc", backgroundImage: "repeating-linear-gradient(45deg,#e8dfc8 0,#e8dfc8 2px,transparent 2px,transparent 14px),repeating-linear-gradient(-45deg,#e8dfc8 0,#e8dfc8 2px,transparent 2px,transparent 14px)" } },
  { id: "dusty-rose", label: "Dusty Rose", style: { backgroundColor: "#f2ddd8", backgroundImage: "radial-gradient(circle,#d4a5a0 8px,transparent 8px)", backgroundSize: "38px 38px" } },
  { id: "sage", label: "Sage Green", style: { backgroundColor: "#d4e8d6", backgroundImage: "linear-gradient(45deg,#b8d9bc 25%,transparent 25%),linear-gradient(-45deg,#b8d9bc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#b8d9bc 75%),linear-gradient(-45deg,transparent 75%,#b8d9bc 75%)", backgroundSize: "28px 28px", backgroundPosition: "0 0,0 14px,14px -14px,-14px 0" } },
  { id: "midnight", label: "Midnight", style: { backgroundColor: "#1a1528", backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.7) 1px,transparent 1px),radial-gradient(circle,rgba(212,168,73,0.5) 0.8px,transparent 0.8px)", backgroundSize: "50px 50px,35px 35px", backgroundPosition: "0 0,18px 22px" } },
  { id: "charcoal-stripe", label: "Dark Stripes", style: { background: "repeating-linear-gradient(90deg,#1e1a2e 0,#1e1a2e 38px,#252035 38px,#252035 60px,#1a1628 60px,#1a1628 90px)" } },
  { id: "warm-grey", label: "Warm Grey", style: { backgroundColor: "#e8e4dc", backgroundImage: "linear-gradient(#d8d3c8 1px,transparent 1px),linear-gradient(90deg,#d8d3c8 1px,transparent 1px)", backgroundSize: "40px 40px" } },
  { id: "navy-dots", label: "Navy Dots", style: { backgroundColor: "#1e2a4a", backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.25) 2px,transparent 2px)", backgroundSize: "30px 30px" } },
  { id: "blush-stripe", label: "Blush Stripe", style: { background: "repeating-linear-gradient(90deg,#f7c5be,#f7c5be 10px,#fde8e4 10px,#fde8e4 20px)" } },
  { id: "forest", label: "Forest", style: { backgroundColor: "#2a3e2c", backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.08) 2px,transparent 2px)", backgroundSize: "24px 24px" } },
  { id: "pale-gold", label: "Pale Gold", style: { background: "repeating-linear-gradient(45deg,#f9e4a0,#f9e4a0 20px,#f5d880 20px,#f5d880 40px)" } },
  { id: "slate", label: "Slate Blue", style: { backgroundColor: "#3a4a6a", backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,0.06) 0,rgba(255,255,255,0.06) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 8px)" } },
  { id: "terracotta", label: "Terracotta", style: { backgroundColor: "#c87941", backgroundImage: "radial-gradient(circle,rgba(0,0,0,0.12) 3px,transparent 3px)", backgroundSize: "20px 20px" } },
  { id: "custom-color", label: "Solid", style: { backgroundColor: "#e8e0d0" }, isCustom: true },
];

const SOLID_COLORS = ["#e8e0d0", "#c8d8e8", "#d0e8d0", "#e8d0d8", "#d8d0e8", "#e8e4c0", "#c8e0e0", "#e0d0c0", "#d0c8e0", "#e0e8d0"];

// ─────────────────── FRAME COLORS ───────────────────
const FRAME_COLORS = [
  "#7a4520", "#c4a040", "#e06878", "#4a88c8", "#3a8c5a", "#8858c8", "#c84040",
  "#e09020", "#18a888", "#203040", "#ece8e0", "#141414", "#d46060", "#8878d0",
];

// ─────────────────── OVERLAYS ───────────────────
function OrnateOverlay({ color }) {
  const c = color || "#c4a040";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      {[[4, 4], [96, 4], [4, 96], [96, 96]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x},${y} Q${x < 50 ? x + 10 : x - 10},${y} ${x < 50 ? x + 10 : x - 10},${y < 50 ? y + 10 : y - 10}`} fill="none" stroke={c} strokeWidth="1.8" />
          <path d={`M${x},${y} Q${x},${y < 50 ? y + 10 : y - 10} ${x < 50 ? x + 10 : x - 10},${y < 50 ? y + 10 : y - 10}`} fill="none" stroke={c} strokeWidth="1.8" />
          <circle cx={x} cy={y} r="2.2" fill={c} />
        </g>
      ))}
      <ellipse cx="50" cy="3" rx="6" ry="2" fill={c} opacity="0.7" />
      <ellipse cx="50" cy="97" rx="6" ry="2" fill={c} opacity="0.7" />
      <ellipse cx="3" cy="50" rx="2" ry="6" fill={c} opacity="0.7" />
      <ellipse cx="97" cy="50" rx="2" ry="6" fill={c} opacity="0.7" />
    </svg>
  );
}
function FloralOverlay({ color }) {
  const c = color || "#e06878";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      {[[4, 4], [50, 3], [96, 4], [97, 50], [96, 96], [50, 97], [4, 96], [3, 50]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r="3" fill={c} opacity="0.9" />
          <circle r="1.2" fill="white" opacity="0.5" />
        </g>
      ))}
      <path d="M4,4 Q27,3 50,3 Q73,3 96,4" fill="none" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <path d="M4,96 Q27,97 50,97 Q73,97 96,96" fill="none" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <path d="M4,4 Q3,27 3,50 Q3,73 4,96" fill="none" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <path d="M96,4 Q97,27 97,50 Q97,73 96,96" fill="none" stroke={c} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
function GeometricOverlay({ color }) {
  const c = color || "#4a88c8";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="96" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
      <rect x="7" y="7" width="86" height="86" fill="none" stroke={c} strokeWidth="0.7" opacity="0.35" strokeDasharray="4 3" />
      {[[5, 5], [95, 5], [5, 95], [95, 95]].map(([x, y], i) => (
        <polygon key={i} points={`${x},${y - 4} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`} fill={c} opacity="0.85" />
      ))}
      <line x1="47" y1="2" x2="53" y2="2" stroke={c} strokeWidth="2.5" />
      <line x1="47" y1="98" x2="53" y2="98" stroke={c} strokeWidth="2.5" />
      <line x1="2" y1="47" x2="2" y2="53" stroke={c} strokeWidth="2.5" />
      <line x1="98" y1="47" x2="98" y2="53" stroke={c} strokeWidth="2.5" />
    </svg>
  );
}
function RusticOverlay({ color }) {
  const c = color || "#7a4520";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke={c} strokeWidth="3.2" rx="1.5" />
      <rect x="5.5" y="5.5" width="89" height="89" fill="none" stroke={c} strokeWidth="0.8" opacity="0.45" rx="1" />
      {[[6, 6], [94, 6], [6, 94], [94, 94]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="none" stroke={c} strokeWidth="1.5" opacity="0.7" />
      ))}
      {[0, 3, 6, 9].map(o => (
        <line key={o} x1="0" y1={o} x2="100" y2={o + 0.5} stroke={c} strokeWidth="0.8" opacity="0.1" />
      ))}
    </svg>
  );
}
function StarOverlay({ color }) {
  const c = color || "#e09020";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      {[[5, 5], [50, 2], [95, 5], [98, 50], [95, 95], [50, 98], [5, 95], [2, 50]].map(([x, y], i) => {
        const pts = [];
        for (let j = 0; j < 5; j++) {
          const a = (j * 4 * Math.PI / 5) - Math.PI / 2;
          pts.push(`${x + 4.5 * Math.cos(a)},${y + 4.5 * Math.sin(a)}`);
          const b = a + 2 * Math.PI / 5;
          pts.push(`${x + 2 * Math.cos(b)},${y + 2 * Math.sin(b)}`);
        }
        return <polygon key={i} points={pts.join(" ")} fill={c} opacity="0.8" />;
      })}
      <rect x="2" y="2" width="96" height="96" fill="none" stroke={c} strokeWidth="0.8" opacity="0.35" />
    </svg>
  );
}
function NoneOverlay() { return null; }
function MatOverlay({ color }) {
  const c = color || "#ece8e0";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="1" y="1" width="98" height="98" fill="none" stroke={c} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
function ThinOverlay({ color }) {
  const c = color || "#141414";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke={c} strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}
function DustOverlay({ color }) {
  const c = color || "#d4a849";
  const stars = useRef([...Array(20)].map(() => ({ x: Math.random() * 100, y: Math.random() * 100 }))).current;
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r="0.7" fill={c} opacity="0.75" />)}
      <rect x="2" y="2" width="96" height="96" fill="none" stroke={c} strokeWidth="1.2" />
    </svg>
  );
}
function WaveOverlay({ color }) {
  const c = color || "#3a8c5a";
  return (
    <svg className="frame-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M0,5 Q10,2 20,5 Q30,8 40,5 Q50,2 60,5 Q70,8 80,5 Q90,2 100,5" fill="none" stroke={c} strokeWidth="1.2" opacity="0.6" />
      <path d="M0,95 Q10,92 20,95 Q30,98 40,95 Q50,92 60,95 Q70,98 80,95 Q90,92 100,95" fill="none" stroke={c} strokeWidth="1.2" opacity="0.6" />
      <path d="M5,0 Q2,10 5,20 Q8,30 5,40 Q2,50 5,60 Q8,70 5,80 Q2,90 5,100" fill="none" stroke={c} strokeWidth="1.2" opacity="0.6" />
      <path d="M95,0 Q92,10 95,20 Q98,30 95,40 Q92,50 95,60 Q98,70 95,80 Q92,90 95,100" fill="none" stroke={c} strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

const FRAME_DESIGNS = [
  { id: "plain", label: "Plain", Overlay: NoneOverlay, defaultColor: "#7a4520", thick: "10px" },
  { id: "ornate", label: "Ornate", Overlay: OrnateOverlay, defaultColor: "#c4a040", thick: "10px" },
  { id: "floral", label: "Floral", Overlay: FloralOverlay, defaultColor: "#e06878", thick: "8px" },
  { id: "geo", label: "Geo", Overlay: GeometricOverlay, defaultColor: "#4a88c8", thick: "7px" },
  { id: "rustic", label: "Rustic", Overlay: RusticOverlay, defaultColor: "#7a4520", thick: "12px" },
  { id: "star", label: "Stars", Overlay: StarOverlay, defaultColor: "#e09020", thick: "9px" },
  { id: "wave", label: "Wave", Overlay: WaveOverlay, defaultColor: "#3a8c5a", thick: "8px" },
  { id: "dust", label: "Dust", Overlay: DustOverlay, defaultColor: "#d4a849", thick: "6px" },
  { id: "mat", label: "Mat", Overlay: MatOverlay, defaultColor: "#ece8e0", thick: "14px" },
  { id: "thin", label: "Thin", Overlay: ThinOverlay, defaultColor: "#141414", thick: "4px" },
  { id: "none", label: "None", Overlay: NoneOverlay, defaultColor: "transparent", thick: "0" },
  { id: "sticker", label: "Sticker", Overlay: NoneOverlay, defaultColor: "transparent", thick: "0", isSticker: true },
];

// ─────────────────── IMAGE FILTERS ───────────────────
const FILTERS = [
  { id: "none", label: "Natural", css: "none", swatch: "linear-gradient(135deg,#fff,#f0e0c0)" },
  { id: "warm", label: "Warm", css: "sepia(0.3) saturate(1.2) brightness(1.05)", swatch: "linear-gradient(135deg,#f5d090,#e8a060)" },
  { id: "cool", label: "Cool", css: "hue-rotate(20deg) saturate(0.9) brightness(1.05)", swatch: "linear-gradient(135deg,#90c0f5,#6090d8)" },
  { id: "mono", label: "Mono", css: "grayscale(1)", swatch: "linear-gradient(135deg,#ddd,#888)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(1.1)", swatch: "linear-gradient(135deg,#d4b878,#a08040)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.1)", swatch: "linear-gradient(135deg,#f060a0,#40a0f0)" },
  { id: "fade", label: "Fade", css: "opacity(0.85) brightness(1.1) saturate(0.8)", swatch: "linear-gradient(135deg,#e8e0d0,#c0b8a8)" },
  { id: "dramatic", label: "Dark", css: "brightness(0.8) contrast(1.3)", swatch: "linear-gradient(135deg,#404040,#202020)" },
];

// ─────────────────── HELPERS ───────────────────
function shade(hex, amt) {
  const h = (hex || "#888").replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0xFF) + amt));
  return "#" + [R, G, B].map(v => v.toString(16).padStart(2, "0")).join("");
}
function gid() { return Math.random().toString(36).slice(2, 9); }

function DesignPreview({ design, color }) {
  const Overlay = design.Overlay;
  const bg = color === "transparent" ? "rgba(255,255,255,0.06)" : color;
  return (
    <div className="dpreview" style={{ background: bg, border: `1.5px solid ${shade(color || "#888", -25)}` }}>
      <Overlay color={shade(color || "#888", 40)} />
      <div className="dpreview-inner" />
    </div>
  );
}

function HoldRing({ progress, x, y, active }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="hold-ring-container" style={{ left: x, top: y, opacity: active ? 1 : 0, transition: 'opacity 0.2s' }}>
      <svg className="hold-ring" width="60" height="60">
        <circle
          cx="30" cy="30" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ opacity: progress > 0 ? 1 : 0 }}
        />
      </svg>
    </div>
  );
}

function makeFrames() {
  return [
    { id: gid(), x: 22, y: 10, w: 14, h: 42, shape: "rect", designId: "ornate", color: "#c4a040", rotation: 0, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 38, y: 7, w: 18, h: 35, shape: "rect", designId: "mat", color: "#ece8e0", rotation: 0, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 59, y: 14, w: 12, h: 30, shape: "circle", designId: "floral", color: "#e06878", rotation: 0, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 72, y: 9, w: 20, h: 38, shape: "rect", designId: "rustic", color: "#7a4520", rotation: -2, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 38, y: 52, w: 10, h: 28, shape: "rect", designId: "thin", color: "#141414", rotation: 1, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 51, y: 54, w: 16, h: 32, shape: "arch", designId: "geo", color: "#4a88c8", rotation: 0, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 70, y: 55, w: 12, h: 25, shape: "oval", designId: "star", color: "#e09020", rotation: 3, zIndex: 10, imgSrc: null, label: "", filter: "none" },
    { id: gid(), x: 85, y: 20, w: 10, h: 55, shape: "rect", designId: "ornate", color: "#8858c8", rotation: 0, zIndex: 10, imgSrc: null, label: "", filter: "none" },
  ];
}

function wpStyle(w) {
  const wp = WALLPAPERS.find(p => p.id === w.wallpaperId);
  if (!wp) return {};
  if (wp.isCustom && w.customColor) return { backgroundColor: w.customColor };
  return wp.style;
}

// ─────────────────── STORAGE ───────────────────
const DB_NAME = "MuseumGalleryDB";
const STORE_NAME = "galleryState";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveState(walls) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(walls, "current");
  } catch (e) {
    console.error("Save failed", e);
  }
}

async function loadState() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    return new Promise((resolve) => {
      const req = tx.objectStore(STORE_NAME).get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

// ─────────────────── MAIN COMPONENT ───────────────────
export default function MuseumGallery() {
  const [walls, setWalls] = useState([
    { id: "w1", name: "The Grand Salon", wallpaperId: "ivory-linen", customColor: null, wpHue: 0, frames: makeFrames() },
    { id: "w2", name: "Moonlight Gallery", wallpaperId: "midnight", customColor: null, wpHue: 0, frames: makeFrames() },
  ]);
  const isLoaded = useRef(false);

  useEffect(() => {
    loadState().then(saved => {
      if (saved) setWalls(saved);
      isLoaded.current = true;
    });
  }, []);

  const [curIdx, setCurIdx] = useState(0);
  const [selId, setSelId] = useState(null);
  const [tab, setTab] = useState("frame");
  const [lightbox, setLightbox] = useState(null);
  const [modal, setModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWp, setNewWp] = useState("ivory-linen");
  const [savedBadge, setSavedBadge] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [cropModal, setCropModal] = useState(null);
  const [guides, setGuides] = useState([]);
  const [holdState, setHoldState] = useState({ progress: 0, x: 0, y: 0, active: false });
  const [pulseFrameId, setPulseFrameId] = useState(null);
  const [croppingId, setCroppingId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const copiedFrame = useRef(null);
  const wallsRef = useRef(walls);
  useEffect(() => { wallsRef.current = walls; }, [walls]);

  const wall = walls[curIdx] || walls[0] || null;
  const selFrame = wall?.frames?.find(f => f.id === selId) || null;

  const pushState = useCallback((newWalls) => {
    setHistory(h => [...h, walls].slice(-50));
    setFuture([]);
    setWalls(newWalls);
  }, [walls]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [walls, ...f]);
    setHistory(h => h.slice(0, -1));
    setWalls(prev);
  }, [history, walls]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, walls]);
    setFuture(f => f.slice(1));
    setWalls(next);
  }, [future, walls]);

  const copyFrame = useCallback(() => {
    if (selFrame) {
      copiedFrame.current = { ...selFrame };
      if (navigator.vibrate) navigator.vibrate(20);
    }
  }, [selFrame]);

  const pasteFrame = useCallback(() => {
    if (copiedFrame.current && wall) {
      const newF = {
        ...copiedFrame.current,
        id: "f" + Date.now(),
        x: copiedFrame.current.x + 5,
        y: copiedFrame.current.y + 5
      };
      pushState(walls.map(w => w.id === wall.id ? { ...w, frames: [...(w.frames || []), newF] } : w));
      setSelId(newF.id);
    }
  }, [walls, wall, pushState]);

  useEffect(() => {
    const onKey = (e) => {
      const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
      if (isInput) return;

      if ((e.metaKey || e.ctrlKey)) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
        }
        if (e.key.toLowerCase() === 'c') {
          e.preventDefault();
          copyFrame();
        }
        if (e.key.toLowerCase() === 'v') {
          // Only paste if it's not a text paste
          if (!e.clipboardData) {
            e.preventDefault();
            pasteFrame();
          }
        }
      }
      if (e.key === "Enter") {
        if (croppingId) {
          e.preventDefault();
          setCroppingId(null);
        } else if (modal) {
          handleAddWall();
        }
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selFrame && wall) {
          e.preventDefault();
          delFrame(wall.id, selFrame.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, copyFrame, pasteFrame, selFrame, wall]);

  const holdTimer = useRef(null);
  const holdInterval = useRef(null);

  const scrollRef = useRef(null);
  const wallRef = useRef(null);
  const ix = useRef(null);

  // Auto-save
  useEffect(() => {
    if (!isLoaded.current) return;
    saveState(walls);
    setSavedBadge(true);
    const t = setTimeout(() => setSavedBadge(false), 1400);
    return () => clearTimeout(t);
  }, [walls]);

  // Paste handler
  useEffect(() => {
    const onPaste = (e) => {
      if (!selFrame) return;
      const items = [...e.clipboardData.items];

      const imgItem = items.find(i => i.type.startsWith("image/"));
      if (imgItem) {
        const file = imgItem.getAsFile();
        const reader = new FileReader();
        reader.onload = ev => compressImg(ev.target.result, url => updFrame(wall.id, selFrame.id, { imgSrc: url }));
        reader.readAsDataURL(file);
      } else {
        const text = e.clipboardData.getData("text");
        if (text && (text.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)/i) || text.startsWith("data:image/"))) {
          updFrame(wall.id, selFrame.id, { imgSrc: text });
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [selFrame, wall]);

  const updWall = useCallback((wid, patch, save = false) => {
    setWalls(prev => {
      const next = prev.map(w => w.id === wid ? { ...w, ...patch } : w);
      if (save) pushState(next);
      return next;
    });
  }, [pushState]);

  const updFrame = useCallback((wid, fid, patch, save = false) => {
    setWalls(prev => {
      const next = prev.map(w => w.id === wid ? {
        ...w,
        frames: w.frames.map(f => f.id === fid ? { ...f, ...patch } : f)
      } : w);
      if (save) pushState(next);
      return next;
    });
  }, [pushState]);

  const delFrame = useCallback((wid, fid) => {
    pushState(walls.map(w => w.id === wid ? { ...w, frames: (w.frames || []).filter(f => f.id !== fid) } : w));
    setSelId(null);
  }, [walls, pushState]);

  const addFrame = useCallback((wid) => {
    const f = { id: gid(), x: 32, y: 20, w: 15, h: 35, shape: "rect", designId: "classic", color: "#f5f5f5", rotation: 0, zIndex: 10, imgSrc: null, label: "", filter: "none" };
    pushState(walls.map(w => w.id === wid ? { ...w, frames: [...(w.frames || []), f] } : w));
    setSelId(f.id);
    setTab("frame");
    setCollapsed(false);
  }, [walls, pushState]);

  const addSticker = useCallback((wid) => {
    const f = { id: gid(), x: 40, y: 30, w: 10, h: 20, shape: "rect", designId: "sticker", color: "transparent", rotation: 0, zIndex: 15, imgSrc: null, label: "", filter: "none" };
    pushState(walls.map(w => w.id === wid ? { ...w, frames: [...(w.frames || []), f] } : w));
    setSelId(f.id);
  }, [walls, pushState]);

  function compressImg(src, cb) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1000;
      let w = img.width, h = img.height;
      if (w > h && w > MAX) { h *= MAX / w; w = MAX; }
      else if (h > MAX) { w *= MAX / h; h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", 0.7));
    };
  }

  // ── POINTER LOGIC ──
  const SNAP_THRESH = 2; // percent
  function calcGuides(frameId, x, y, w, h, allFrames) {
    const cx = x + w / 2, cy = y + h / 2;
    const rx = x + w, ry = y + h;
    const gs = [];
    for (const f of allFrames) {
      if (f.id === frameId) continue;
      const fx = f.x, fy = f.y, fw = f.w, fh = f.h;
      const fcx = fx + fw / 2, fcy = fy + fh / 2, frx = fx + fw, fry = fy + fh;
      if (Math.abs(cx - fcx) < SNAP_THRESH) gs.push({ type: "v", pos: cx });
      if (Math.abs(x - fx) < SNAP_THRESH) gs.push({ type: "v", pos: x });
      if (Math.abs(rx - frx) < SNAP_THRESH) gs.push({ type: "v", pos: rx });
      if (Math.abs(cy - fcy) < SNAP_THRESH) gs.push({ type: "h", pos: cy });
      if (Math.abs(y - fy) < SNAP_THRESH) gs.push({ type: "h", pos: y });
      if (Math.abs(ry - fry) < SNAP_THRESH) gs.push({ type: "h", pos: ry });
    }
    return gs;
  }

  const getDistance = (e) => {
    if (e.touches && e.touches.length >= 2) {
      return Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
    return 0;
  };

  const onFramePD = useCallback((e, frame, wallId, mode = "select", dir = null) => {
    e.stopPropagation();
    const wallEl = wallRef.current;
    if (!wallEl) return;
    const rect = wallEl.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (mode === "select") {
      setSelId(frame.id);

      // Start Long Press
      setHoldState({ progress: 0, x: clientX, y: clientY, active: true });
      const startTime = Date.now();
      const DURATION = 600;

      holdInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / DURATION) * 100);
        setHoldState(prev => ({ ...prev, progress }));

        if (elapsed >= DURATION) {
          clearInterval(holdInterval.current);
          setHoldState(prev => ({ ...prev, active: false }));
          // Trigger Edit Mode
          setTab("frame");
          setCollapsed(false);
          setPulseFrameId(frame.id);
          setTimeout(() => setPulseFrameId(null), 800);
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }, 16);

      if (e.metaKey || e.ctrlKey) { setTab("frame"); setCollapsed(false); }
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
      ix.current = {
        mode: "drag", frameId: frame.id, wallId,
        sx: clientX, sy: clientY, ox: frame.x, oy: frame.y,
        ww: rect.width, wh: rect.height,
        holdActive: true
      };
      setIsDragging(true);
    } else if (mode === "crop") {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
      ix.current = {
        mode: "crop", frameId: frame.id, wallId,
        sx: clientX, sy: clientY,
        oox: frame.imgOx || 0, ooy: frame.imgOy || 0,
        oos: frame.imgScale || 1,
        startDist: getDistance(e),
        ww: rect.width, wh: rect.height
      };
      setIsDragging(true);
    } else if (mode === "resize") {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
      ix.current = { mode: "resize", frameId: frame.id, wallId, dir, sx: e.clientX, sy: e.clientY, ox: frame.x, oy: frame.y, ow: frame.w, oh: frame.h, ww: rect.width, wh: rect.height };
      setIsDragging(true);
    } else if (mode === "rotate") {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { }
      const cx = rect.left + (frame.x + frame.w / 2) / 100 * rect.width;
      const cy = rect.top + (frame.y + frame.h / 2) / 100 * rect.height;
      ix.current = { mode: "rotate", frameId: frame.id, wallId, cx, cy, startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI, origRot: frame.rotation || 0 };
      setIsDragging(true);
    }
  }, []);

  const onPMove = useCallback((e) => {
    const d = ix.current;
    if (!d) return;

    if (d.mode === "drag" && d.holdActive) {
      const dist = Math.hypot(e.clientX - d.sx, e.clientY - d.sy);
      if (dist > 12) {
        d.holdActive = false;
        clearInterval(holdInterval.current);
        setHoldState(prev => ({ ...prev, active: false }));
      }
    }

    if (d.mode === "drag") {
      const dx = (e.clientX - d.sx) / d.ww * 100;
      const dy = (e.clientY - d.sy) / d.wh * 100;
      const nx = Math.max(1, Math.min(93, d.ox + dx));
      const ny = Math.max(2, Math.min(82, d.oy + dy));
      updFrame(d.wallId, d.frameId, { x: nx, y: ny });

      // Guides
      const w = wallsRef.current.find(w => w.id === d.wallId);
      if (w) {
        const f = w.frames?.find(f => f.id === d.frameId);
        if (f) {
          const gs = calcGuides(d.frameId, nx, ny, f.w, f.h, w.frames || []);
          setGuides(gs);
        }
      }
    } else if (d.mode === "crop") {
      if (e.touches && e.touches.length >= 2) {
        // Pinch zoom
        const dist = getDistance(e);
        if (d.startDist > 0 && dist > 0) {
          const ratio = dist / d.startDist;
          const newScale = Math.max(1.0, Math.min(5, d.oos * ratio));
          updFrame(d.wallId, d.frameId, { imgScale: newScale });
        }
      } else {
        // Pan
        const dx = (e.clientX - d.sx) / d.ww * 100;
        const dy = (e.clientY - d.sy) / d.wh * 100;
        const SENSE = 1.8;
        updFrame(d.wallId, d.frameId, { imgOx: d.oox + dx * SENSE, imgOy: d.ooy + dy * SENSE });
      }
    } else if (d.mode === "resize") {
      const dx = (e.clientX - d.sx) / d.ww * 100;
      const dy = (e.clientY - d.sy) / d.wh * 100;
      const MIN = 5;
      let { ox: x, oy: y, ow: fw, oh: fh } = d;
      if (d.dir.includes("e")) fw = Math.max(MIN, fw + dx);
      if (d.dir.includes("s")) fh = Math.max(MIN, fh + dy);
      if (d.dir.includes("w")) { x = Math.min(x + fw - MIN, x + dx); fw = Math.max(MIN, fw - dx); }
      if (d.dir.includes("n")) { y = Math.min(y + fh - MIN, y + dy); fh = Math.max(MIN, fh - dy); }
      updFrame(d.wallId, d.frameId, { x, y, w: fw, h: fh });
    } else if (d.mode === "rotate") {
      const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180 / Math.PI;
      updFrame(d.wallId, d.frameId, { rotation: d.origRot + (a - d.startAngle) });
    }
  }, [updFrame]);

  const onPUp = useCallback(() => {
    if (ix.current) pushState(walls);
    ix.current = null;
    setIsDragging(false);
    setGuides([]);
    clearInterval(holdInterval.current);
    setHoldState(prev => ({ ...prev, active: false }));
  }, [walls, pushState]);

  const onScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
    setCurIdx(Math.min(idx, walls.length - 1));
    setSelId(null);
    setCollapsed(true);
  };

  const handleAddWall = () => {
    const id = "w" + gid();
    const name = newName.trim() || `Gallery No. ${walls.length + 1}`;
    pushState([...walls, { id, name, wallpaperId: newWp, customColor: null, wpHue: 0, frames: makeFrames() }]);
    setModal(false); setNewName("");
    setTimeout(() => scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" }), 80);
  };

  const delWall = (wid) => {
    if (walls.length <= 1) return;
    pushState(walls.filter(w => w.id !== wid));
    setCurIdx(0);
  };

  // ── RENDER ──
  return (
    <>
      <style>{CSS}</style>
      <div className={`app ${croppingId ? "is-cropping" : ""}`} onPointerMove={onPMove} onPointerUp={onPUp} onPointerLeave={onPUp}>

        {/* TOP BAR */}
        <header className="topbar">
          <div className="logo">The Gallery</div>
          <div className="history-controls">
            <button className="hist-btn" onClick={undo} disabled={history.length === 0} title="Undo (Cmd+Z)">⟲</button>
            <button className="hist-btn" onClick={redo} disabled={future.length === 0} title="Redo (Cmd+Shift+Z)">⟳</button>
          </div>
          <div className="topbar-hint">Long Press to edit </div>
          <div className="room-pill">Room {curIdx + 1} / {walls.length}</div>
          {savedBadge && <div className="save-badge">✓ Saved</div>}
        </header>

        <div className="body">
          {/* SIDEBAR */}
          <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <button className="toggle-btn" onClick={() => setCollapsed(v => !v)}>
              {collapsed ? "›" : "‹"}
            </button>

            {!collapsed && (
              <div className="sidebar-inner">
                <div className="tabs">
                  <button className={`tab ${tab === "frame" ? "active" : ""}`} onClick={() => setTab("frame")}>Frame</button>
                  <button className={`tab ${tab === "image" ? "active" : ""}`} onClick={() => setTab("image")}>Image</button>
                  <button className={`tab ${tab === "wall" ? "active" : ""}`} onClick={() => setTab("wall")}>Wall</button>
                </div>

                {/* FRAME TAB */}
                {tab === "frame" && (
                  <div className="panel">
                    {!selFrame ? (
                      <div className="empty-state">
                        <div className="empty-icon">🖼️</div>
                        <p className="empty-text">Select a frame to edit its properties</p>
                        <div className="hint-chip">Long Press to open panel</div>
                        <button className="add-btn" style={{ marginTop: 4 }} onClick={() => wall && addFrame(wall.id)}>+ Add Frame</button>
                        <button className="add-btn" style={{ background: "rgba(212,168,73,0.1)", borderColor: "rgba(212,168,73,0.28)", color: "var(--gold-lt)" }} onClick={() => wall && addSticker(wall.id)}>+ Add Sticker</button>
                      </div>
                    ) : (
                      <>
                        <div className="sec-title">Layer</div>
                        <div className="layer-row">
                          <button className="layer-btn up" onClick={() => updFrame(wall.id, selFrame.id, { zIndex: (selFrame.zIndex || 10) + 1 }, true)}>↑ Front</button>
                          <button className="layer-btn dn" onClick={() => updFrame(wall.id, selFrame.id, { zIndex: Math.max(1, (selFrame.zIndex || 10) - 1) }, true)}>↓ Back</button>
                          <span className="z-badge">z{selFrame.zIndex || 10}</span>
                        </div>

                        <div className="sec-title">Shape</div>
                        <div className="shape-grid">
                          {[["rect", "▭", "Rect"], ["square", "■", "Square"], ["circle", "●", "Circle"], ["oval", "⬬", "Oval"], ["arch", "⌒", "Arch"]].map(([id, icon, lbl]) => (
                            <button key={id} className={`shape-btn ${selFrame.shape === id ? "active" : ""}`}
                              onClick={() => updFrame(wall.id, selFrame.id, { shape: id }, true)}>
                              <span className="sb-icon">{icon}</span>
                              <span className="sb-lbl">{lbl}</span>
                            </button>
                          ))}
                        </div>

                        <div className="sec-title">Size</div>
                        <div className="size-row">
                          <div className="size-label"><span className="slbl">W</span><span className="sval">{Math.round(selFrame.w)}%</span></div>
                          <input type="range" min="5" max="45" step="0.5" className="slider"
                            value={selFrame.w} onChange={e => updFrame(wall.id, selFrame.id, { w: parseFloat(e.target.value) }, true)} />
                          <div className="size-label" style={{ marginTop: 4 }}><span className="slbl">H</span><span className="sval">{Math.round(selFrame.h)}%</span></div>
                          <input type="range" min="5" max="75" step="0.5" className="slider"
                            value={selFrame.h} onChange={e => updFrame(wall.id, selFrame.id, { h: parseFloat(e.target.value) }, true)} />
                        </div>

                        <div className="sec-title">Frame Style</div>
                        <div className="design-grid">
                          {FRAME_DESIGNS.map(d => (
                            <button key={d.id} className={`design-btn ${selFrame.designId === d.id ? "active" : ""}`}
                              onClick={() => updFrame(wall.id, selFrame.id, { designId: d.id }, true)}>
                              <DesignPreview design={d} color={selFrame.color || d.defaultColor} />
                              <span>{d.label}</span>
                            </button>
                          ))}
                        </div>

                        <div className="sec-title">Frame Color</div>
                        <div className="color-row">
                          {FRAME_COLORS.map(c => (
                            <button key={c} className={`cdot ${selFrame.color === c ? "active" : ""}`}
                              style={{ background: c, border: `1.5px solid ${shade(c, -30)}` }}
                              onClick={() => updFrame(wall.id, selFrame.id, { color: c }, true)} />
                          ))}
                          <label className="custom-color-wrap" title="Custom">
                            <input type="color" value={selFrame.color || "#7a4520"}
                              onChange={e => updFrame(wall.id, selFrame.id, { color: e.target.value }, true)} />
                          </label>
                        </div>

                        <div className="sec-title">Rotation</div>
                        <div className="rot-row">
                          <input type="range" min="-45" max="45" step="1" className="slider"
                            style={{ flex: 1 }} value={selFrame.rotation || 0}
                            onChange={e => updFrame(wall.id, selFrame.id, { rotation: parseFloat(e.target.value) }, true)} />
                          <span className="rot-val">{Math.round(selFrame.rotation || 0)}°</span>
                          <button className="rot-reset" onClick={() => updFrame(wall.id, selFrame.id, { rotation: 0 }, true)}>↺</button>
                        </div>

                        <div className="panel-footer" style={{ marginTop: "auto", paddingTop: 20 }}>
                          <button className="del-btn" style={{ width: "100%", padding: "10px", fontSize: "11px", fontWeight: "500" }}
                            onClick={() => { delFrame(wall.id, selFrame.id); setSelId(null); }}>
                            🗑 Delete Frame
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* IMAGE TAB */}
                {tab === "image" && (
                  <div className="panel">
                    {!selFrame ? (
                      <div className="empty-state">
                        <div className="empty-icon">🎨</div>
                        <p className="empty-text">Select a frame to adjust its artwork</p>
                      </div>
                    ) : (
                      <>
                        <div className="sec-title">Artwork</div>
                        <label className="upload-zone">
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files[0]; if (!file) return;
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = ev => compressImg(ev.target.result, url => updFrame(wall.id, selFrame.id, { imgSrc: url }, true));
                          }} />
                          <span>↑ Upload Image</span>
                        </label>
                        <div style={{ fontSize: "8px", fontWeight: 400, color: "var(--muted)", letterSpacing: "1px", marginTop: 2 }}>OR PASTE URL</div>
                        <input className="txt-input" placeholder="https://..."
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updFrame(wall.id, selFrame.id, { imgSrc: e.target.value }, true);
                              e.target.value = '';
                            }
                          }} />

                        {selFrame.imgSrc && (
                          <>
                            <div className="sec-title">Adjust Image</div>
                            <div className="size-row">
                              <div className="size-label"><span className="slbl">Zoom</span><span className="sval">{Math.round((selFrame.imgScale || 1) * 100)}%</span></div>
                              <input type="range" min="1" max="4" step="0.05" className="slider"
                                value={selFrame.imgScale || 1} onChange={e => updFrame(wall.id, selFrame.id, { imgScale: parseFloat(e.target.value) }, true)} />
                            </div>
                            <div className="size-row" style={{ marginTop: 8 }}>
                              <div className="size-label"><span className="slbl">Pan X</span><span className="sval">{Math.round(selFrame.imgOx || 0)}%</span></div>
                              <input type="range" min="-100" max="100" step="1" className="slider"
                                value={selFrame.imgOx || 0} onChange={e => updFrame(wall.id, selFrame.id, { imgOx: parseFloat(e.target.value) }, true)} />
                            </div>
                            <div className="size-row" style={{ marginTop: 8 }}>
                              <div className="size-label"><span className="slbl">Pan Y</span><span className="sval">{Math.round(selFrame.imgOy || 0)}%</span></div>
                              <input type="range" min="-100" max="100" step="1" className="slider"
                                value={selFrame.imgOy || 0} onChange={e => updFrame(wall.id, selFrame.id, { imgOy: parseFloat(e.target.value) }, true)} />
                            </div>

                            <div className="sec-title">Flip</div>
                            <div className="layer-row">
                              <button className={`layer-btn ${selFrame.imgFlipX ? "up" : ""}`} style={{ background: selFrame.imgFlipX ? "rgba(155,126,248,0.2)" : "transparent" }}
                                onClick={() => updFrame(wall.id, selFrame.id, { imgFlipX: !selFrame.imgFlipX }, true)}>⟷ Flip H</button>
                              <button className={`layer-btn ${selFrame.imgFlipY ? "up" : ""}`} style={{ background: selFrame.imgFlipY ? "rgba(155,126,248,0.2)" : "transparent" }}
                                onClick={() => updFrame(wall.id, selFrame.id, { imgFlipY: !selFrame.imgFlipY }, true)}>⟳ Flip V</button>
                            </div>

                            <div className="sec-title">Image Filter</div>

                            <div className="filter-grid">
                              {FILTERS.map(f => (
                                <button key={f.id} className={`filter-btn ${(selFrame.filter || "none") === f.id ? "active" : ""}`}
                                  onClick={() => updFrame(wall.id, selFrame.id, { filter: f.id }, true)}>
                                  <div className="filter-swatch" style={{ background: f.swatch }} />
                                  <span>{f.label}</span>
                                </button>
                              ))}
                            </div>

                            <button className="add-btn" style={{ marginTop: 12, width: "100%", background: "rgba(212,168,73,0.1)", borderColor: "rgba(212,168,73,0.3)" }}
                              onClick={() => setCroppingId(selFrame.id)}>
                              ✂️ In-Situ Crop Mode
                            </button>
                          </>
                        )}

                        <div className="panel-footer" style={{ marginTop: "auto", paddingTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="add-btn" style={{ flex: 1, margin: 0, padding: "10px" }} onClick={copyFrame}>📋 Copy</button>
                            <button className="add-btn" style={{ flex: 1, margin: 0, padding: "10px" }} onClick={pasteFrame}>📥 Paste</button>
                          </div>
                          <button className="del-btn" style={{ width: "100%", padding: "10px", fontSize: "11px", fontWeight: "500" }}
                            onClick={() => { delFrame(wall.id, selFrame.id); setSelId(null); }}>
                            🗑 Delete Frame
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* WALL TAB */}
                {tab === "wall" && wall && (
                  <div className="panel">
                    <div className="sec-title">Room Name</div>
                    <input className="txt-input" value={wall.name} onChange={e => updWall(wall.id, { name: e.target.value }, true)} />

                    <div className="sec-title">Wallpaper</div>
                    <div className="wp-grid">
                      {WALLPAPERS.map(wp => (
                        <button key={wp.id}
                          className={`wp-btn ${wall.wallpaperId === wp.id ? "active" : ""}`}
                          style={wp.isCustom ? { background: wall.customColor || wp.style.backgroundColor } : wp.style}
                          onClick={() => updWall(wall.id, { wallpaperId: wp.id }, true)} title={wp.label}>
                          {wall.wallpaperId === wp.id && <span className="wp-check">✓</span>}
                        </button>
                      ))}
                    </div>

                    {wall.wallpaperId === "custom-color" ? (
                      <>
                        <div className="sec-title">Pick Color</div>
                        <div className="color-swatches">
                          {SOLID_COLORS.map(c => (
                            <button key={c} className={`swatch ${wall.customColor === c ? "active" : ""}`}
                              style={{ background: c }} onClick={() => updWall(wall.id, { customColor: c })} />
                          ))}
                        </div>
                        <input type="color" className="color-picker-full"
                          value={wall.customColor || "#e8e0d0"}
                          onChange={e => updWall(wall.id, { customColor: e.target.value })} />
                      </>
                    ) : (
                      <>
                        <div className="sec-title">Tint</div>
                        <div className="rot-row">
                          <input type="range" min="0" max="360" step="1" className="slider"
                            style={{ flex: 1 }} value={wall.wpHue || 0}
                            onChange={e => updWall(wall.id, { wpHue: parseInt(e.target.value) })} />
                          <span className="rot-val">{wall.wpHue || 0}°</span>
                          <button className="rot-reset" onClick={() => updWall(wall.id, { wpHue: 0 })}>↺</button>
                        </div>
                      </>
                    )}

                    <button className="add-btn" style={{ marginTop: 12 }} onClick={() => setModal(true)}>+ New Room</button>
                    <button className="del-btn" style={{ marginTop: 8, width: "100%" }} onClick={() => delWall(wall.id)}>🗑 Delete Room</button>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* GALLERY */}
          <main className="gallery">
            <div className="scroll-area" ref={scrollRef} onScroll={onScroll}
              onClick={() => { setSelId(null); setCollapsed(true); setCroppingId(null); }}>
              {walls.map((w, wi) => (
                <div key={w.id} className="wall"
                  ref={wi === curIdx ? wallRef : null}>

                  <div className="wallpaper-bg"
                    style={{ ...wpStyle(w), filter: w.wpHue ? `hue-rotate(${w.wpHue}deg)` : undefined }} />

                  <div className="spotlight" style={{ left: "28%" }} />
                  <div className="spotlight" style={{ left: "52%" }} />
                  <div className="spotlight" style={{ left: "74%" }} />

                  <div className="wall-inner" style={{ flex: 1 }}>
                    {/* Alignment guides */}
                    {wi === curIdx && guides.map((g, i) => (
                      g.type === "h"
                        ? <div key={i} className="align-guide h" style={{ top: `${g.pos}%` }} />
                        : <div key={i} className="align-guide v" style={{ left: `${g.pos}%` }} />
                    ))}

                    {[...(w.frames || [])].sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10)).map(frame => {
                      const design = FRAME_DESIGNS.find(d => d.id === frame.designId) || FRAME_DESIGNS[0];
                      const Overlay = design.Overlay;
                      const fc = frame.color || design.defaultColor;
                      const isSel = selId === frame.id && wi === curIdx;
                      const isNone = design.id === "none" || design.isSticker || fc === "transparent";
                      const filterCss = FILTERS.find(f => f.id === (frame.filter || "none"))?.css || "none";
                      const shapeClass = `shape-${frame.shape}`;
                      const isPulsing = pulseFrameId === frame.id;

                      const isCropping = croppingId === frame.id;

                      return (
                        <div key={frame.id}
                          className={`frame ${shapeClass} ${isSel ? "selected" : ""} ${isPulsing ? "edit-confirm-pulse" : ""} ${isCropping ? "cropping-active" : ""}`}
                          style={{
                            left: `${frame.x}%`, top: `${frame.y}%`,
                            width: `${frame.w}%`, height: `${frame.h}%`,
                            transform: `rotate(${frame.rotation || 0}deg) ${isCropping ? "scale(1.03)" : ""}`,
                            zIndex: isCropping ? 1000 : (isSel ? 200 : (frame.zIndex || 10)),
                            background: isNone ? "transparent !important" : (isCropping ? "rgba(0,0,0,0.1)" : fc),
                            border: isNone ? "none" : (isCropping ? "3px solid var(--gold)" : `2px solid ${shade(fc, -30)}`),
                            padding: isNone ? "0" : design.thick,
                            boxShadow: isNone ? "none" : (isCropping ? "0 0 30px var(--gold), 0 20px 60px rgba(0,0,0,0.8)" : `0 10px 40px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.1)`),
                            outline: "none",
                            touchAction: "none",
                            transition: isDragging ? "none" : "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                            overflow: isCropping ? "visible" : "visible",
                          }}
                          onPointerDown={e => onFramePD(e, frame, w.id, isCropping ? "crop" : "select")}
                          onDoubleClick={e => {
                            e.stopPropagation();
                            if (!isCropping) setCroppingId(frame.id);
                          }}
                          onWheel={e => {
                            if (!isCropping) return;
                            e.stopPropagation();
                            const delta = -e.deltaY * 0.001;
                            const newScale = Math.max(1.0, Math.min(5, (frame.imgScale || 1) + delta));
                            updFrame(w.id, frame.id, { imgScale: newScale });
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {isSel && <div className="sel-outline" />}
                          {isCropping && (
                            <>
                              <div className="crop-ghost-container">
                                <img src={frame.imgSrc} alt="" className="crop-ghost"
                                  style={{
                                    transform: `translate(-50%, -50%) translate(${frame.imgOx || 0}%,${frame.imgOy || 0}%) scale(${frame.imgScale || 1}) scaleX(${frame.imgFlipX ? -1 : 1}) scaleY(${frame.imgFlipY ? -1 : 1}) rotate(${frame.imgRot || 0}deg)`,
                                    transformOrigin: "center center",
                                  }} />
                              </div>
                              <div className="crop-grid-overlay">
                                <div className="grid-line v" style={{ left: "33.33%", width: "0.8px", background: "rgba(255,255,255,0.4)" }} />
                                <div className="grid-line v" style={{ left: "66.66%", width: "0.8px", background: "rgba(255,255,255,0.4)" }} />
                                <div className="grid-line h" style={{ top: "33.33%", height: "0.8px", background: "rgba(255,255,255,0.4)" }} />
                                <div className="grid-line h" style={{ top: "66.66%", height: "0.8px", background: "rgba(255,255,255,0.4)" }} />
                              </div>
                              <div className="crop-controls-hint">
                                <button className="crop-done-btn" onClick={(e) => { e.stopPropagation(); setCroppingId(null); }}>
                                  Done
                                </button>
                                <span style={{ fontSize: "10px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>
                                  Drag to Pan • Enter to Save
                                </span>
                              </div>
                            </>
                          )}
                          <div style={{ opacity: isCropping ? 0.2 : 1, transition: "opacity 0.3s", position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
                            <Overlay color={shade(fc, 35)} />
                          </div>
                          <div className={`frame-inner ${shapeClass}`}>
                            {frame.imgSrc ? (
                              <img src={frame.imgSrc} alt="" draggable={false}
                                style={{
                                  transform: `translate(${frame.imgOx || 0}%,${frame.imgOy || 0}%) scale(${frame.imgScale || 1}) scaleX(${frame.imgFlipX ? -1 : 1}) scaleY(${frame.imgFlipY ? -1 : 1}) rotate(${frame.imgRot || 0}deg)`,
                                  transformOrigin: "center center",
                                  filter: filterCss, objectFit: isNone ? "contain" : "cover",
                                  transition: isCropping ? "none" : "filter 0.3s",
                                }}
                              />
                            ) : (
                              !design.isSticker && (
                                <div className="placeholder">
                                  <div className="ph-plus">+</div>
                                </div>
                              )
                            )}
                          </div>
                          {isCropping && (
                            <div className="crop-controls-hint">
                              <button className="crop-done-btn" onClick={(e) => { e.stopPropagation(); setCroppingId(null); }}>Done</button>
                              <span>Drag to move · Pinch to zoom</span>
                            </div>
                          )}

                          {isSel && (
                            <>
                              {[["nw", "top", "left"], ["ne", "top", "right"], ["sw", "bottom", "left"], ["se", "bottom", "right"]].map(([dir, v, h]) => (
                                <div key={dir} className="rhandle"
                                  style={{ [v]: -6, [h]: -6, cursor: `${dir}-resize` }}
                                  onPointerDown={e => { e.stopPropagation(); e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { } onFramePD(e, frame, w.id, "resize", dir); }}
                                  onClick={e => e.stopPropagation()} />
                              ))}
                              <div className="rot-handle"
                                onPointerDown={e => { e.stopPropagation(); e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { } onFramePD(e, frame, w.id, "rotate"); }}
                                onClick={e => e.stopPropagation()}>
                                ↻
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="floor">
                    <div className="floor-boards" />
                    <div className="floor-name">{w.name}</div>
                  </div>
                </div>
              ))}

              <div className="add-wall" onClick={e => { e.stopPropagation(); setModal(true); }}>
                <div className="add-circle">+</div>
                <span>New Room</span>
              </div>
            </div>
          </main>
        </div>

        {/* LIGHTBOX */}
        {lightbox && (
          <div className="lightbox" onClick={() => setLightbox(null)}>
            <button className="lb-close">✕</button>
            <img src={lightbox.src} alt="" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {/* NEW ROOM MODAL */}
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">New Room</div>
              <label className="modal-label">Room Name</label>
              <input className="txt-input" placeholder="e.g. Moonlight Salon"
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddWall()} />
              <label className="modal-label">Wallpaper</label>
              <div className="wp-grid">
                {WALLPAPERS.map(wp => (
                  <button key={wp.id} className={`wp-btn ${newWp === wp.id ? "active" : ""}`}
                    style={wp.style} onClick={() => setNewWp(wp.id)} title={wp.label}>
                    {newWp === wp.id && <span className="wp-check">✓</span>}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setModal(false)}>Cancel</button>
                <button className="create-btn" onClick={handleAddWall}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* CROP / ADJUST MODAL */}
        {cropModal && (
          <div className="modal-overlay" onClick={() => setCropModal(null)}>
            <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title">Adjust Image</div>
              <div style={{ width: "100%", height: 200, overflow: "hidden", borderRadius: 10, border: "0.5px solid var(--glass-b)", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={cropModal.imgSrc} alt="" draggable={false} style={{
                  maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                  transform: `translate(${cropModal.imgOx}%,${cropModal.imgOy}%) scale(${cropModal.imgScale}) rotate(${cropModal.imgRot}deg)`,
                  transition: "transform 0.12s",
                }} />
              </div>
              {[
                ["Pan X", "imgOx", -50, 50, 1, "%"],
                ["Pan Y", "imgOy", -50, 50, 1, "%"],
                ["Zoom", "imgScale", 0.5, 3, 0.05, "×", v => v.toFixed(2)],
                ["Rotate", "imgRot", -180, 180, 1, "°"],
              ].map(([lbl, key, mn, mx, step, unit, fmt]) => (
                <React.Fragment key={key}>
                  <div className="sec-title">{lbl}</div>
                  <div className="rot-row">
                    <input type="range" min={mn} max={mx} step={step} className="slider" style={{ flex: 1 }}
                      value={cropModal[key]}
                      onChange={e => setCropModal(p => ({ ...p, [key]: parseFloat(e.target.value) }))} />
                    <span className="rot-val">{fmt ? fmt(cropModal[key]) : Math.round(cropModal[key])}{unit}</span>
                    {key === "imgRot" && <button className="rot-reset" onClick={() => setCropModal(p => ({ ...p, imgRot: 0 }))}>↺</button>}
                  </div>
                </React.Fragment>
              ))}
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setCropModal(null)}>Cancel</button>
                <button className="cancel-btn" onClick={() => setCropModal(p => ({ ...p, imgOx: 0, imgOy: 0, imgScale: 1, imgRot: 0 }))}>Reset</button>
                <button className="create-btn" onClick={() => {
                  updFrame(cropModal.wallId, cropModal.frameId, { imgOx: cropModal.imgOx, imgOy: cropModal.imgOy, imgScale: cropModal.imgScale, imgRot: cropModal.imgRot });
                  setCropModal(null);
                }}>Apply</button>
              </div>
            </div>
          </div>
        )}

        <HoldRing {...holdState} />
      </div>
    </>
  );
}