'use strict';
(function(){
var base=null,$=function(id){return document.getElementById(id);},screen=1;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function go(step){screen=step;document.querySelectorAll('[data-screen]').forEach(function(x){x.classList.toggle('sp-hidden',Number(x.dataset.screen)!==step)});document.querySelectorAll('.sp-step').forEach(function(x){var s=Number(x.dataset.step);x.classList.toggle('active',s===step);x.classList.toggle('done',s<step)});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
function error(step,msg){var el=$('erro-'+step);el.textContent=msg;el.classList.remove('sp-hidden')}
function clearError(step){$('erro-'+step).classList.add('sp-hidden')}
function radio(name){var el=document.querySelector('input[name="'+name+'"]:checked');return el?el.value:''}
function yes(id){return $(id).checked}
function situacao(){return radio('situacao')}
function tipoGaragem(){return $('tipo-garagem').value}
function temSave(){return $('tem-save').value}
function localizacao(){return radio('localizacao')}
function rotasSaida(){return radio('rotas-saida')}
function compartilhaUso(){return radio('compartilha-uso')}
function compartimentacao(){return radio('compartimentacao')}

function naoAplica(){return tipoGaragem()==='sem-garagem'&&temSave()==='nao'}
function condSave(){return temSave()!==''&&temSave()!=='nao'}
function condGaragem(){return tipoGaragem()!==''&&tipoGaragem()!=='sem-garagem'}
function condExistenteSaveGaragem(){return situacao()==='existente'&&condSave()&&condGaragem()}
function condNovaGaragem(){return situacao()==='nova'&&condGaragem()}
function condExistenteGaragem(){return situacao()==='existente'&&condGaragem()}

function applyVisibility(){
  var save=condSave(),existenteSaveGaragem=condExistenteSaveGaragem(),compartilhaSim=compartilhaUso()==='sim',novaGaragem=condNovaGaragem(),existenteGaragem=condExistenteGaragem();
  document.querySelectorAll('[data-show-if]').forEach(function(el){
    var show;
    switch(el.dataset.showIf){
      case 'save': show=save; break;
      case 'existente-save-garagem': show=existenteSaveGaragem; break;
      case 'compartilha-sim': show=existenteSaveGaragem&&compartilhaSim; break;
      case 'nova-garagem': show=novaGaragem; break;
      case 'existente-garagem': show=existenteGaragem; break;
      default: show=true;
    }
    el.classList.toggle('sp-hidden',!show)
  });
  var note=$('nao-aplica-note');
  if(naoAplica()){note.innerHTML='<strong>Esta Norma Técnica não se aplica ao caso informado.</strong> Sem garagem e sem SAVE instalado ou previsto, não há exigência da NT 17 (item 5.4.1, por analogia — a norma só passa a valer quando existe garagem ou existe SAVE).';note.classList.remove('sp-hidden')}else{note.classList.add('sp-hidden')}
}
document.querySelectorAll('input[name="situacao"],input[name="compartilha-uso"]').forEach(function(el){el.addEventListener('change',applyVisibility)});
$('tipo-garagem').addEventListener('change',applyVisibility);
$('tem-save').addEventListener('change',applyVisibility);

function validate(step){clearError(step);if(step===1){if(!tipoGaragem()){error(1,'Selecione o tipo de garagem/SAVE.');return false}if(!temSave()){error(1,'Selecione a situação do SAVE.');return false}}return true}

function popular(d){base=d;
  d.tiposGaragem.forEach(function(o){var op=document.createElement('option');op.value=o.valor;op.textContent=o.rotulo;$('tipo-garagem').appendChild(op)});
  d.temSaveOpcoes.forEach(function(o){var op=document.createElement('option');op.value=o.valor;op.textContent=o.rotulo;$('tem-save').appendChild(op)});
  applyVisibility();
}

function item(name,status,motivo,ref){return{name:name,status:status,motivo:motivo,ref:ref}}

function assess(){
  var out=[],sit=situacao(),tg=tipoGaragem(),ts=temSave(),save=condSave(),garagem=condGaragem(),loc=localizacao(),rotas=rotasSaida(),modo=$('modo-recarga').value,multi=yes('multifamiliar'),eletroposto=yes('eletroposto'),jaHidrante=yes('ja-hidrante'),jaChuveiro=yes('ja-chuveiro'),ventNatural=yes('ventilacao-natural');

  if(naoAplica()){out.push(item('Sem exigência da NT 17','no','Sem garagem e sem SAVE instalado ou previsto: esta Norma Técnica não acrescenta nenhuma exigência ao caso informado.','Item 5.4.1, por analogia'));return out}

  // 5.1 -- regras gerais do SAVE, sempre que ele existir ou for instalado
  if(save){
    out.push(item('Chave de desligamento local','required','Toda estação de recarga precisa de um ponto de desligamento manual a no máximo 5,00 m dela.','Item 5.1.2, NT 17/CBMPE'));
    out.push(item('Chave de desligamento do pavimento','required','A no máximo 5,00 m da entrada principal, da entrada da garagem ou das escadas de acesso aos pavimentos da garagem.','Item 5.1.3, NT 17/CBMPE'));
    out.push(item('Chave de desligamento geral','required','Disjuntor próprio no quadro de distribuição, cortando a energia entre os módulos de recarga e a rede elétrica.','Item 5.1.4, NT 17/CBMPE'));
    out.push(item('Sinalização do SAVE','required','Placas fotoluminescentes nas vagas, nos pontos de desligamento e no quadro de distribuição, no padrão de cores/textos do Anexo A.','Item 5.1.5, NT 17/CBMPE'));
    if(rotas==='1'){out.push(item('Afastamento das vagas SAVE em relação à saída','required','Só há uma rota de saída de emergência no pavimento: as vagas com SAVE precisam ficar a pelo menos 5 m dela, medidos a partir do perímetro da vaga.','Item 5.1.6, NT 17/CBMPE'))}
    else if(rotas==='2+'){out.push(item('Afastamento das vagas SAVE em relação à saída','no','Há duas ou mais rotas de saída no pavimento: o afastamento mínimo de 5 m deixa de ser exigido e qualquer vaga do pavimento pode receber SAVE.','Item 5.1.6.1, NT 17/CBMPE'))}

    if(loc==='externa'){
      out.push(item('Regras de garagem externa','check','Aplicam-se as regras do item 5.1 no que for cabível; afastamentos de riscos específicos (líquidos inflamáveis, GLP) seguem as Normas Técnicas próprias de cada risco.','Itens 5.2.1–5.2.2, NT 17/CBMPE'));
      if(modo==='1'||modo==='2'){out.push(item('Modo de recarga '+modo+' em garagem externa','check','Só é admitido mediante Gerenciamento de Risco elaborado pelo responsável técnico, demonstrando nível de segurança adequado para o carregamento, com proteção do equipamento contra intempéries.','Item 5.2.3, NT 17/CBMPE'))}
    }
  }

  // 5.3 -- edificacao NOVA com garagem (principal ou subsidiaria), independente de SAVE
  if(garagem&&sit==='nova'){
    out.push(item('Detecção de incêndio na garagem','required','Dimensionada pelos critérios do COSCIP; é vedado usar detector de fumaça nessa área.','Item 5.3.2, NT 17/CBMPE'));
    if(multi){out.push(item('Repetidoras de alarme (residencial multifamiliar)','required','Além da cobertura normal de detecção, instalar repetidoras do alarme (visual e sonoro) no hall social de todos os pavimentos.','Item 5.3.2.1, NT 17/CBMPE'))}
    out.push(item('Chuveiros automáticos na garagem','required','Calculados para classe de ocupação C (segundo o IRB), com chuveiros de resposta rápida, conforme os critérios de dimensionamento do COSCIP.','Item 5.3.3, NT 17/CBMPE'));
    out.push(item('Reserva Técnica de Incêndio (RTI)','required',jaHidrante?'Edificação também com hidrante exigido: somar ao volume da classe C (Quadro 1) o volume do sistema de hidrantes do Art. 57 do COSCIP, conforme a classe de ocupação da edificação (Quadro 2). Elevado classe C: 60.000 L; subterrâneo/superfície classe C: 90.000 L (valores de referência do Quadro 2 para RTI combinada).':'Sem hidrante exigido: RTI mínima de 50% do volume da classe C do Art. 57 do COSCIP (Quadro 1) — 10.800 L em reservatório elevado, ou 30.000 L em subterrâneo/superfície.','Itens 5.3.3.1–5.3.3.2, NT 17/CBMPE'));
    if(ventNatural){out.push(item('Extração mecânica na garagem','no','Pavimento com ventilação natural nos moldes do §2º do Art. 27 do COSCIP: a extração mecânica fica dispensada.','Item 5.3.4.1, NT 17/CBMPE'))}
    else{out.push(item('Extração mecânica na garagem','required','Sistema dimensionado para pelo menos 10 trocas de ar por hora do maior pavimento da garagem, conforme a NBR 16983:2022, com memória de cálculo apresentada ao CBMPE.','Item 5.3.4, NT 17/CBMPE'))}
    out.push(item('Resistência ao fogo dos elementos construtivos (TRRF)','required','TRRF mínimo de 120 minutos nas áreas de garagem, sem isenções ou reduções, mesmo quando a edificação já exigir "Segurança Estrutural".','Item 5.3.5, NT 17/CBMPE'));
  }

  // 5.4 -- edificacao EXISTENTE com garagem, só se tiver ou for instalar SAVE
  if(garagem&&sit==='existente'){
    if(!save){out.push(item('Sem exigência adicional (edificação existente sem SAVE)','no','Sem SAVE instalado ou previsto nesta garagem existente, a edificação continua seguindo só o projeto de segurança contra incêndio originalmente aprovado — a NT 17 não acrescenta nada de novo.','Item 5.4.1, NT 17/CBMPE'))}
    else{
      if(jaChuveiro){out.push(item('Chuveiros automáticos na garagem','no','A edificação já possui chuveiros automáticos na área de garagem: não há necessidade de adaptação.','Item 5.4.4, NT 17/CBMPE'))}
      else{out.push(item('Chuveiros automáticos na garagem','required',jaHidrante?'Pode ser interligado à malha de tubulação do sistema de hidrantes já existente, sem necessidade de majorar a Reserva Técnica de Incêndio (RTI).':'A ser instalado; ver a RTI mínima aplicável a edificações novas (itens 5.3.3.1–5.3.3.2) como referência de dimensionamento.','Item 5.4.3, NT 17/CBMPE'))}
      out.push(item('Detecção e alarme de incêndio na garagem','required','Dimensionado pelos critérios do COSCIP, cobrindo toda a área de garagens.','Item 5.4.5, NT 17/CBMPE'));
      if(multi){out.push(item('Repetidoras de alarme (residencial multifamiliar)','required','Além da cobertura normal de detecção, instalar repetidoras do alarme (visual e sonoro) no hall social de todos os pavimentos.','Item 5.4.6.1, NT 17/CBMPE'))}
      if(compartilhaUso()==='nao'){
        out.push(item('Abrangência das medidas no pavimento','info','Pavimento de uso exclusivo de garagem: as medidas de detecção e chuveiros podem ficar restritas ao(s) pavimento(s) com SAVE. Os demais pavimentos seguem só as exigências da própria ocupação, mas o alarme de incêndio deve continuar interligado e abranger toda a edificação.','Item 5.4.7, NT 17/CBMPE'));
      }else if(compartilhaUso()==='sim'){
        if(compartimentacao()==='sim'){out.push(item('Abrangência das medidas no pavimento','info','Há compartimentação horizontal resistente ao fogo (NT 1.04) entre a garagem e os demais ambientes: a detecção e os chuveiros podem ficar restritos à área da garagem. O alarme de incêndio deve continuar interligado e abranger toda a edificação.','Item 5.4.8, alínea a, NT 17/CBMPE'))}
        else if(compartimentacao()==='nao'){out.push(item('Abrangência das medidas no pavimento','required','Sem compartimentação horizontal resistente ao fogo: a detecção e os chuveiros precisam cobrir todo o pavimento, não só a área/vaga do SAVE. O alarme de incêndio deve continuar interligado e abranger toda a edificação.','Item 5.4.8, alínea b, NT 17/CBMPE'))}
      }
    }
  }

  // 5.5 -- eletroposto comercial
  if(eletroposto){
    out.push(item('Extintores nas estações de carregamento (eletroposto)','required','Proteção por extintores com capacidade extintora mínima 4-A:40B:C (Art. 42 do COSCIP); um extintor pode proteger mais de uma estação, desde que o caminhamento não ultrapasse 15 m.','Item 5.5.4, NT 17/CBMPE'));
    out.push(item('Demais sistemas do eletroposto','info','Seguem os itens 5.3 (edificação nova) ou 5.4 (existente) já listados acima, conforme a situação informada; se a recarga for em área externa, aplica-se também o item 5.2.','Item 5.5.3, NT 17/CBMPE'));
  }

  return out;
}

function card(x){var tag={required:'Exigido',check:'Verificar',no:'Dispensado',info:'Informativo'}[x.status];return'<article class="sp-result '+(x.status==='required'?'':x.status)+'"><div class="sp-result-head"><h3>'+esc(x.name)+'</h3><span class="sp-tag">'+tag+'</span></div><p>'+esc(x.motivo)+'</p><p class="ref">'+esc(x.ref)+'</p></article>'}

function calculate(){
  var list=assess(),req=list.filter(function(x){return x.status==='required'}),check=list.filter(function(x){return x.status==='check'}),info=list.filter(function(x){return x.status==='info'}),no=list.filter(function(x){return x.status==='no'});
  var reqInfo=req.concat(info);
  var o=base.tiposGaragem.find(function(x){return x.valor===tipoGaragem()});
  $('perfil').innerHTML='<strong>'+esc(situacao()==='nova'?'Edificação nova':'Edificação existente')+'</strong><br>'+esc(o?o.rotulo:'')+' · SAVE: '+esc((base.temSaveOpcoes.find(function(x){return x.valor===temSave()})||{}).rotulo||'—');
  var uniBanner=$('unifamiliar-banner');
  if(yes('unifamiliar')){uniBanner.className='sp-note';uniBanner.innerHTML='<strong>Residência unifamiliar:</strong> a lista abaixo é recomendada como boa prática, mas não é obrigatória para o licenciamento desta edificação (itens 2.b e 7.1 da NT 17).';uniBanner.classList.remove('sp-hidden')}else{uniBanner.classList.add('sp-hidden')}
  var isentoBanner=$('isento-banner');
  if(naoAplica()){isentoBanner.innerHTML='<strong>Esta Norma Técnica não se aplica ao caso informado.</strong> Sem garagem e sem SAVE instalado ou previsto.';isentoBanner.classList.remove('sp-hidden')}else{isentoBanner.classList.add('sp-hidden')}
  $('resumo').innerHTML='<span class="sp-pill req">'+req.length+' itens exigidos</span><span class="sp-pill check">'+check.length+' verificações complementares</span><span class="sp-pill no">'+no.length+' dispensados/não acionados</span>';
  $('exigidos').innerHTML=reqInfo.length?reqInfo.map(card).join(''):'<p>Nenhum item foi acionado.</p>';
  $('verificar').innerHTML=check.map(card).join('');
  $('verificar-wrap').classList.toggle('sp-hidden',!check.length);
  $('nao-exigidos').innerHTML=no.length?no.map(card).join(''):'<p>Nenhum item dispensado.</p>';
  go(3);
}

$('continuar-1').addEventListener('click',function(){if(!validate(1))return;if(naoAplica()){calculate();return}go(2)});
document.querySelectorAll('[data-back]').forEach(function(b){b.addEventListener('click',function(){go(Number(b.dataset.back))})});
$('calcular').addEventListener('click',calculate);
$('reiniciar').addEventListener('click',function(){location.reload()});

var helpPop=null;
function ensureHelpPop(){if(helpPop)return helpPop;helpPop=document.createElement('div');helpPop.className='sp-help-pop sp-hidden';helpPop.setAttribute('role','tooltip');document.body.appendChild(helpPop);return helpPop}
function closeHelp(){if(!helpPop)return;helpPop.classList.add('sp-hidden');helpPop.innerHTML='';document.querySelectorAll('.sp-help[aria-expanded="true"]').forEach(function(b){b.setAttribute('aria-expanded','false')})}
function openHelp(btn){var id=btn.dataset.help,h=base&&base.ajuda&&base.ajuda[id];if(!h)return;var pop=ensureHelpPop();pop.innerHTML='<strong>'+esc(h.titulo)+'</strong><p>'+esc(h.texto)+'</p>'+(h.excerto?'<blockquote>“'+esc(h.excerto)+'”</blockquote>':(h.resumo?'<p class="resumo">'+esc(h.resumo)+'</p>':''))+(h.artigo?'<span class="ref">'+esc(h.artigo)+'</span>':'');pop.classList.remove('sp-hidden');var pw=Math.min(320,window.innerWidth-24);pop.style.width=pw+'px';var r=btn.getBoundingClientRect(),left=Math.min(Math.max(8,r.left),window.innerWidth-pw-8),top=r.bottom+window.scrollY+8;pop.style.left=left+'px';pop.style.top=top+'px';pop.dataset.owner=id;btn.setAttribute('aria-expanded','true')}
document.addEventListener('click',function(e){var btn=e.target.closest&&e.target.closest('.sp-help');if(btn){e.preventDefault();var open=helpPop&&!helpPop.classList.contains('sp-hidden')&&helpPop.dataset.owner===btn.dataset.help;closeHelp();if(!open)openHelp(btn);return}if(helpPop&&!helpPop.classList.contains('sp-hidden')&&!(e.target.closest&&e.target.closest('.sp-help-pop')))closeHelp()});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeHelp()});
window.addEventListener('scroll',closeHelp,true);window.addEventListener('resize',closeHelp);
document.querySelectorAll('[data-back]').forEach(function(b){b.addEventListener('click',closeHelp)});
$('continuar-1').addEventListener('click',closeHelp);

fetch('content/save.json').then(function(r){if(!r.ok)throw new Error();return r.json()}).then(popular).catch(function(){document.querySelector('[data-screen="1"]').innerHTML='<h2>Base temporariamente indisponível</h2><p>Tente novamente em instantes.</p>'});
})();
