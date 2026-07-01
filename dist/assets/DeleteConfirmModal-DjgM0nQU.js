import{j as d,o as e,A as c,q as s}from"./index-_Jt2ivqM.js";/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=d("PenSquare",[["path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1qinfi"}],["path",{d:"M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z",key:"w2jsv5"}]]);/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=d("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);function u({onConfirm:l,onCancel:n,colors:a,isSoundOn:t,title:i="Yakin Hapus Data?",desc:r="Tindakan ini tidak dapat dibatalkan.",btnText:x="Hapus Data"}){return e.jsx("div",{className:"fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4",children:e.jsxs("div",{className:`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${a.panel} border ${a.border} text-center`,children:[e.jsx(c,{size:48,className:"mx-auto text-red-500 mb-4"}),e.jsx("h3",{className:`text-xl font-bold mb-2 ${a.text}`,children:i}),e.jsx("p",{className:`text-sm mb-6 ${a.textMuted}`,children:r}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:()=>{s("pop",t),n()},className:`flex-1 py-2 rounded-xl border font-semibold ${a.text} ${a.border}`,children:"Batal"}),e.jsx("button",{onClick:()=>{s("pop",t),l()},className:"flex-1 py-2 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600",children:x})]})]})})}export{u as D,p as P,m as a};
