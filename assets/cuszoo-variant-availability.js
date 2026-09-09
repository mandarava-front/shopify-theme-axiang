(function(){"use strict";
function apply(root){root&&root.querySelectorAll("variant-selects .product-form__input").forEach(group=>{
  const radios=Array.from(group.querySelectorAll('input[type="radio"]'));
  if(radios.length){
    const available=radios.filter(r=>!r.disabled&&!r.classList.contains("disabled"));
    radios.forEach(r=>{const label=group.querySelector(`label[for="${CSS.escape(r.id)}"]`);label&&(label.hidden=r.disabled||r.classList.contains("disabled"))});
    group.hidden=available.length<=1;
    // 只剩一个可选值却没被选中（如 Hat 下 Size 只有 Adult、当前仍是 S）→ 自动选中，
    // 否则变体解析为空（input[name=id] 空），Customily 的条件显示/切模板不会触发
    if(available.length===1&&!available[0].checked)available[0].click();
    return}
  const select=group.querySelector("select");if(!select)return;
  const available=Array.from(select.options).filter(o=>!o.disabled);
  group.hidden=available.length<=1;
  if(available.length===1&&select.value!==available[0].value){select.value=available[0].value;select.dispatchEvent(new Event("change",{bubbles:true}))}
})}
function init(){const product=document.querySelector('[data-template="product"]');product&&(apply(product),new MutationObserver(()=>apply(product)).observe(product,{childList:!0,subtree:!0}))}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:!0}):init()})();