// Freelancer Pricing Calculator — all maths runs in the browser, nothing is uploaded.
function num(id){ var v=parseFloat(document.getElementById(id).value); return isFinite(v)?v:0; }
function money(n){ return "$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function calc(){
  var hours=num("hours"), rate=num("rate"), expenses=num("expenses");
  var margin=num("margin"), revHours=num("revHours"), contingency=num("contingency"), fee=num("fee");
  if(fee>=100) fee=99; if(fee<0) fee=0;
  var labour=hours*rate;
  var revision=revHours*rate;
  var base=labour+revision+expenses;
  var cont=base*contingency/100;
  var cost=base+cont;
  // True profit margin: margin is % of the price before the platform fee,
  // so price before fee = cost / (1 - margin%). E.g. cost $2,420, margin 20%
  // -> $3,025, profit $605 = 20% of $3,025.
  if(margin>=100) margin=99; if(margin<0) margin=0;
  var beforeFee= margin>0 ? cost/(1-margin/100) : cost;
  var profit=beforeFee-cost;
  var finalPrice= fee>0 ? beforeFee/(1-fee/100) : beforeFee;
  var feeAmount=finalPrice-beforeFee;
  var keep=finalPrice-feeAmount;
  var deposit=finalPrice*0.5;
  document.getElementById("rLabour").textContent=money(labour);
  document.getElementById("rRevision").textContent=money(revision);
  document.getElementById("rExpenses").textContent=money(expenses);
  document.getElementById("rCont").textContent=money(cont);
  document.getElementById("rProfit").textContent=money(profit);
  document.getElementById("rBeforeFee").textContent=money(beforeFee);
  document.getElementById("rFee").textContent=money(feeAmount);
  document.getElementById("rFinal").textContent=money(finalPrice);
  document.getElementById("rKeep").textContent=money(keep);
  document.getElementById("rDeposit").textContent=money(deposit);
  document.getElementById("rRateNote").textContent = hours>0 ? ("Your rate: "+money(rate)+"/hour × "+hours+" hours") : "";
  var client=document.getElementById("client").value||"Client";
  var project=document.getElementById("project").value||"Project";
  var rounds=document.getElementById("rounds").value||"2";
  var date=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  var quote="QUOTATION — "+project.toUpperCase()+"\nDate: "+date+"\nClient: "+client+"\n\n"
    +"Work: "+hours+" hours at "+money(rate)+"/hour = "+money(labour)+"\n"
    +"Revision allowance: "+revHours+" hours = "+money(revision)+"\n"
    +"Extra expenses: "+money(expenses)+"\n"
    +"Contingency ("+contingency+"%): "+money(cont)+"\n"
    +"Profit margin ("+margin+"%): "+money(profit)+"\n"
    +"Price before platform fee: "+money(beforeFee)+"\n"
    +"Platform fee ("+fee+"%): "+money(feeAmount)+"\n"
    +"TOTAL PRICE: "+money(finalPrice)+"\n"
    +"You keep after the fee: "+money(keep)+"\n"
    +"Deposit to start (50%): "+money(deposit)+"\n\n"
    +"Included: "+rounds+" revision rounds. Extra revisions are charged at "+money(rate)+"/hour.\n"
    +"Not included: extra pages, extra features, stock photos, or hosting, unless listed above.\n"
    +"This quote is valid for 14 days.";
  document.getElementById("quoteText").textContent=quote;
  return {finalPrice:finalPrice, quote:quote};
}
["hours","rate","expenses","margin","revHours","contingency","fee","rounds","client","project"].forEach(function(id){
  var el=document.getElementById(id); if(el) el.addEventListener("input",calc);
});
document.getElementById("btnSample").addEventListener("click",function(){
  document.getElementById("hours").value=20; document.getElementById("rate").value=50;
  document.getElementById("expenses").value=0; document.getElementById("margin").value=20;
  document.getElementById("revHours").value=2; document.getElementById("contingency").value=0;
  document.getElementById("fee").value=10; document.getElementById("rounds").value=2;
  document.getElementById("project").value="Business website"; document.getElementById("client").value="Example Client";
  calc();
});
document.getElementById("btnClear").addEventListener("click",function(){
  ["hours","rate","expenses","margin","revHours","contingency","fee","rounds","client","project"].forEach(function(id){document.getElementById(id).value="";});
  document.getElementById("margin").value=20; document.getElementById("fee").value=0; document.getElementById("rounds").value=2; calc();
});
document.getElementById("btnCopy").addEventListener("click",function(){
  var r=calc(); navigator.clipboard.writeText(r.quote).then(function(){document.getElementById("copyMsg").textContent="Copied.";});
});
document.getElementById("btnPrint").addEventListener("click",function(){ calc(); window.print(); });
calc();
