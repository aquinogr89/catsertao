'use strict';
(function(){
var base=null,$=function(id){return document.getElementById(id);},screen=1;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function go(step){screen=step;document.querySelectorAll('[data-screen]').forEach(function(x){x.classList.toggle('sp-hidden',Number(x.dataset.screen)!==step)});document.querySelectorAll('.sp-step').forEach(function(x){var s=Number(x.dataset.step);x.classList.toggle('active',s===step);x.classList.toggle('done',s<step)});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
function error(step,msg){var el=$('erro-'+step);el.textContent=msg;el.classList.remove('sp-hidden')}
function clearError(step){$('erro-'+step).classList.add('sp-hidden')}
function radio(name){var el=document.querySelector('input[name="'+name+'"]:checked');return el?el.value:''}
function yes(id){var el=$(id);return !!(el&&el.checked)}
function situacao(){return radio('situacao')}
function tipoLocal(){return $('tipo-local').value}
function localDef(){var v=tipoLocal();return base?base.tiposLocal.find(function(x){return x.valor===v}):null}
function classe(){var d=localDef();return d?d.classe:''}
function temSave(){return $('tem-save').value}

function save(){return temSave()!==''&&temSave()!=='nao'}
function interna(){return classe()==='interna'}
function externa(){return classe()==='externa'}
// Sem SAVE, a NT 17 so tem o que dizer quando ha garagem INTERNA: o item 5.3
// vale para edificacao nova "independente da previsao de instalacao de SAVE"
// (5.3.1) e o 5.4.1 resolve o caso da existente. Area externa e "so ponto de
// recarga" sem SAVE ficam fora do alcance da norma.
function naoAplica(){return !save()&&!interna()}
function condInternaExistenteSave(){return interna()&&situacao()==='existente'&&save()}

function applyVisibility(){
  var s=save(),int_=interna(),compartilhaSim=radio('compartilha-uso')==='sim';
  document.querySelectorAll('[data-show-if]').forEach(function(el){
    var show;
    switch(el.dataset.showIf){
      case 'save': show=s; break;
      case 'interna': show=int_; break;
      case 'interna-existente': show=int_&&situacao()==='existente'; break;
      case 'interna-existente-save': show=condInternaExistenteSave(); break;
      case 'compartilha-sim': show=condInternaExistenteSave()&&compartilhaSim; break;
      default: show=true;
    }
    el.classList.toggle('sp-hidden',!show)
  });
  var note=$('nao-aplica-note');
  if(naoAplica()&&tipoLocal()&&temSave()){note.innerHTML='<strong>A NT 17 não acrescenta exigência ao caso informado.</strong> Sem SAVE instalado ou previsto e sem garagem interna, não há o que esta Norma Técnica exija — as regras do item 5.1 valem onde há SAVE, e as dos itens 5.3/5.4 são dirigidas às garagens internas.';note.classList.remove('sp-hidden')}else{note.classList.add('sp-hidden')}
}
document.querySelectorAll('input[name="situacao"]').forEach(function(el){el.addEventListener('change',applyVisibility)});
$('tem-save').addEventListener('change',applyVisibility);
$('tipo-local').addEventListener('change',function(){aplicarRotaPadrao();applyVisibility()});

function aplicarRotaPadrao(){
  var d=localDef();if(!d)return;
  var alvo=document.querySelector('input[name="rotas-saida"][value="'+d.rotaPadrao+'"]');
  if(alvo)alvo.checked=true;
}

function validate(step){clearError(step);if(step===1){if(!tipoLocal()){error(1,'Selecione onde ficam as vagas ou o ponto de recarga.');return false}if(!temSave()){error(1,'Selecione a situação do SAVE.');return false}}return true}

function popular(d){base=d;
  d.tiposLocal.forEach(function(o){var op=document.createElement('option');op.value=o.valor;op.textContent=o.rotulo;$('tipo-local').appendChild(op)});
  d.temSaveOpcoes.forEach(function(o){var op=document.createElement('option');op.value=o.valor;op.textContent=o.rotulo;$('tem-save').appendChild(op)});
  $('rotas-wrap').innerHTML=d.rotasOpcoes.map(function(o,i){return'<label><input type="radio" name="rotas-saida" value="'+esc(o.valor)+'"'+(i===0?' checked':'')+'> '+esc(o.rotulo)+'</label>'}).join('');
  document.querySelectorAll('input[name="compartilha-uso"]').forEach(function(el){el.addEventListener('change',applyVisibility)});
  applyVisibility();
}

function item(name,status,motivo,ref,extras){var o={name:name,status:status,motivo:motivo,ref:ref};if(extras){if(extras.figura)o.figura=extras.figura;if(extras.tabela)o.tabela=extras.tabela;if(extras.passos)o.passos=extras.passos}return o}

function assess(){
  var out=[],sit=situacao(),cl=classe(),s=save(),rotas=radio('rotas-saida'),modo=$('modo-recarga').value,
      multi=yes('multifamiliar'),eletroposto=yes('eletroposto'),jaHidrante=yes('ja-hidrante'),jaChuveiro=yes('ja-chuveiro'),
      d=localDef(),ventNatural=d?d.ventilacaoNatural:false,int_=interna(),ext=externa();

  if(naoAplica()){out.push(item('Sem exigência da NT 17','no','Sem SAVE instalado ou previsto e sem garagem interna, esta Norma Técnica não acrescenta nenhuma exigência ao caso informado.','Itens 5.1, 5.3 e 5.4, NT 17/CBMPE'));return out}

  // ---- Item 5.1: regras gerais, valem para locais internos OU externos onde haja SAVE ----
  if(s){
    out.push(item('Chave de desligamento local','required','Cada estação de recarga precisa de um ponto de desligamento manual a no máximo 5,00 m dela.','Item 5.1.2, NT 17/CBMPE'));
    out.push(item('Chave de desligamento do pavimento','required','Ponto de desligamento manual de todas as estações, a no máximo 5,00 m da entrada principal, da entrada da garagem ou das escadas de acesso aos pavimentos da garagem.','Item 5.1.3, NT 17/CBMPE'));
    out.push(item('Chave de desligamento geral','required','Disjuntor próprio no quadro de distribuição, garantindo o corte de energia entre os módulos de recarga e a rede elétrica.','Item 5.1.4, NT 17/CBMPE'));

    out.push(item('Sinalização da estação de recarga','required','Placa retangular fotoluminescente, mínimo 40x20 cm, instalada a 1,80 m do piso acabado até a base da placa. Fundo branco com ícone circular azul-escuro; dentro do círculo, pictograma de bomba de abastecimento com um raio no corpo e um plugue de recarga ao lado, em bege claro. Abaixo, tarja azul-escura com duas linhas: "S.A.V.E." em maiúsculas e negrito e, embaixo, o modo de recarga'+(modo?' — no seu caso, "MODO '+esc(modo)+'"':' ("MODO 1", "MODO 2", "MODO 3" ou "MODO 4", conforme a estação instalada)')+'.','Item 5.1.5, alíneas a e c, NT 17/CBMPE',{figura:'fig2'}));
    out.push(item('Sinalização do quadro de distribuição','required','Placa retangular fotoluminescente com borda vermelha, mínimo 20x40 cm, instalada a 1,80 m do piso acabado até a base da placa. No topo, triângulo amarelo com raio preto indicando risco elétrico; texto principal "Quadro de Distribuição" em negrito e, na linha de baixo, "Recarga de Veículos Elétricos". A sinalização deve endereçar a posição de cada SAVE e o disjuntor correspondente.','Item 5.1.5, alíneas a e b, NT 17/CBMPE',{figura:'fig1'}));
    out.push(item('Sinalização das chaves de desligamento','required','Placa retangular fotoluminescente de fundo vermelho, mínimo 40x20 cm, instalada a 1,80 m do piso acabado até a base da placa, nas chaves de desligamento de emergência (local e do pavimento). Desenho centralizado de uma mão com o dedo indicador estendido apontando para baixo, em direção a um quadrado (o botão de emergência). Abaixo, texto centralizado em cinco linhas: "S.A.V.E." (em negrito e maior, para destaque imediato), "DESLIGAMENTO DO", "SISTEMA DE", "ALIMENTAÇÃO", "DE VEÍCULO ELÉTRICO".','Item 5.1.5, alíneas a e d, NT 17/CBMPE',{figura:'fig3'}));

    if(rotas==='1'){
      out.push(item('Afastamento das vagas SAVE em relação à saída','required','Há apenas uma rota de saída de emergência no pavimento: as estações de recarga precisam ficar a pelo menos 5 m dela. A distância é medida a partir do perímetro de demarcação da vaga. As vagas dentro desse raio devem ser identificadas em projeto como proibidas para instalação de SAVE.','Itens 5.1.6 e 5.1.6.2, NT 17/CBMPE',{figura:'fig4'}));
    }else if(rotas==='2+'){
      out.push(item('Afastamento das vagas SAVE em relação à saída','no','Há duas ou mais rotas de saída de emergência no pavimento: o afastamento mínimo de 5 m deixa de ser exigido e todas as vagas do pavimento podem receber SAVE.','Item 5.1.6.1, NT 17/CBMPE',{figura:'fig5'}));
    }else{
      out.push(item('Afastamento das vagas SAVE em relação à saída','no','Área aberta com saída direta para o exterior: não há rota de saída de emergência a ser preservada, e o afastamento do item 5.1.6 não tem o que proteger. O item 5.2.1 manda aplicar as regras do item 5.1 às áreas externas apenas "no que for aplicável", e as Figuras 4 e 5 da norma ilustram justamente garagens fechadas, com escadas de emergência. Se o analista do CBMPE entender diferente no caso concreto, prevalece a análise dele.','Itens 5.1.6 e 5.2.1, NT 17/CBMPE'));
    }

    out.push(item('Responsabilidade técnica da instalação','info','A instalação e a garantia de eficiência do local de recarga cabem integralmente ao responsável técnico e/ou à empresa instaladora, junto com o proprietário/responsável pelo uso do SAVE, que devem atender às normas referenciadas no item 3 da NT (NBR 5410, NBR 17019, NBR IEC 61851-1, NBR 16983 e Portaria Inmetro nº 440/2021).','Item 5.1.1, NT 17/CBMPE'));
  }

  // ---- Item 5.2: garagens/areas externas ----
  if(ext&&s){
    out.push(item('Afastamento de riscos específicos','check','Os afastamentos em relação a riscos específicos — áreas com líquidos igníferos e GLP — seguem os parâmetros das Normas Técnicas próprias de cada risco, não da NT 17. Verifique se há esses riscos no entorno das vagas.','Item 5.2.2, NT 17/CBMPE'));
    if(modo==='1'||modo==='2'){
      out.push(item('Gerenciamento de Risco (modo '+esc(modo)+' em área externa)','required','Os modos 1 e 2 só são admitidos em garagem externa se o responsável técnico elaborar Gerenciamento de Risco demonstrando que os fatores de instalação adotados mantêm nível de segurança adequado para o carregamento. Nesse caso, o RT também deve prever proteção do equipamento contra intempéries.','Item 5.2.3, NT 17/CBMPE'));
    }else if(modo==='3'||modo==='4'){
      out.push(item('Modo de recarga em área externa','no','Os modos 3 e 4 já são definidos pela norma para uso em áreas internas e externas: não dependem do Gerenciamento de Risco exigido para os modos 1 e 2 em garagem externa.','Itens 4.7.3, 4.7.4 e 5.2.3, NT 17/CBMPE'));
    }else{
      out.push(item('Modo de recarga em área externa','check','Defina o modo de recarga: se for modo 1 ou 2, a norma exige Gerenciamento de Risco do responsável técnico e proteção contra intempéries; modos 3 e 4 já são previstos para uso interno e externo.','Itens 4.7.1–4.7.4 e 5.2.3, NT 17/CBMPE'));
    }
    out.push(item('Sistemas de garagem interna não se aplicam','no','As exigências de detecção, chuveiros automáticos, extração mecânica de fumaça, RTI e TRRF de 120 minutos estão nos itens 5.3 e 5.4, que a norma dirige expressamente às garagens internas. Como aqui as vagas ficam fora do volume principal da edificação (item 4.4), o regime aplicável é o do item 5.2, que remete ao item 5.1 no que for cabível.','Itens 4.4, 5.2, 5.3 e 5.4, NT 17/CBMPE'));
  }

  // ---- Item 5.3: edificacao NOVA com garagem INTERNA (independe de SAVE) ----
  if(int_&&sit==='nova'){
    out.push(item('Detecção de incêndio na garagem','required','Exigida onde houver ocupação com garagem, independentemente de haver SAVE, dimensionada pelos critérios do COSCIP. É vedado o uso de detectores de fumaça nessa área.','Itens 5.3.1 e 5.3.2, NT 17/CBMPE'));
    if(multi)out.push(item('Repetidoras de alarme no hall social','required','Ocupação residencial multifamiliar: além da cobertura de detecção da garagem, instalar repetidoras do alarme (visual e sonoro) no hall social de todos os pavimentos.','Item 5.3.2.1, NT 17/CBMPE'));
    out.push(item('Chuveiros automáticos na garagem','required','Calculados para classe de ocupação "C" (segundo o IRB), com chuveiros de resposta rápida, conforme os critérios de dimensionamento do COSCIP.','Item 5.3.3, NT 17/CBMPE'));
    out.push(item('Reserva Técnica de Incêndio (RTI)','required',jaHidrante?'A edificação também tem hidrantes exigidos: ao volume de 50% do risco classe C soma-se a RTI do sistema de hidrantes (Art. 57 do COSCIP), conforme a classe de ocupação e o tipo de reservatório — use o Quadro 2 abaixo.':'Só o sistema de chuveiros é exigido: a RTI corresponde a 50% do volume do risco classe C do Art. 57 do COSCIP, conforme o tipo de reservatório — use o Quadro 1 abaixo.','Itens 5.3.3.1 e 5.3.3.2, NT 17/CBMPE',{tabela:jaHidrante?'quadro2':'quadro1'}));
    if(ventNatural){
      out.push(item('Extração mecânica de fumaça','no','O pavimento tem ventilação natural nos moldes do §2º do Art. 27 do COSCIP (perímetro aberto ao exterior): a extração mecânica fica dispensada.','Item 5.3.4.1, NT 17/CBMPE'));
    }else{
      out.push(item('Extração mecânica de fumaça','required','Sistema dimensionado para no mínimo 10 trocas do volume de ar por hora do maior pavimento da ocupação garagem, pelos parâmetros da NBR 16983:2022, com apresentação da memória de cálculo ao CBMPE.','Item 5.3.4, NT 17/CBMPE'));
    }
    out.push(item('Resistência ao fogo (TRRF de 120 min)','required','Os elementos construtivos das áreas de garagem devem ter Tempo Requerido de Resistência ao Fogo de no mínimo 120 minutos, sem isenções nem reduções, mesmo nas edificações que já exijam "Segurança Estrutural".','Item 5.3.5, NT 17/CBMPE'));
  }

  // ---- Item 5.4: edificacao EXISTENTE com garagem INTERNA + SAVE ----
  if(int_&&sit==='existente'){
    if(!s){
      out.push(item('Sem exigência adicional (existente sem SAVE)','no','Sem SAVE instalado ou previsto, a garagem existente continua seguindo apenas as medidas do projeto de segurança contra incêndio e pânico originalmente aprovado — a NT 17 não acrescenta nada.','Item 5.4.1, NT 17/CBMPE'));
    }else{
      if(jaChuveiro){
        out.push(item('Chuveiros automáticos na garagem','no','A garagem já possui chuveiros automáticos: não há necessidade de adaptação por causa da NT 17.','Item 5.4.4, NT 17/CBMPE'));
      }else{
        out.push(item('Chuveiros automáticos na garagem','required',jaHidrante?'Exigidos na área de garagem. Podem ser interligados à malha de tubulação do sistema de hidrantes já existente e, nesse caso, não é obrigatório majorar a Reserva Técnica de Incêndio (RTI).':'Exigidos na área de garagem. Como não há sistema de hidrantes existente para interligar, o dimensionamento da reserva segue os critérios do COSCIP — confirme o volume com o responsável técnico.','Item 5.4.3, NT 17/CBMPE'));
      }
      out.push(item('Detecção e alarme de incêndio','required','Dimensionado pelos critérios do COSCIP, abrangendo toda a área de garagens de veículos.','Itens 5.4.5 e 5.4.6, NT 17/CBMPE'));
      if(multi)out.push(item('Repetidoras de alarme no hall social','required','Ocupação residencial multifamiliar: além da cobertura de detecção, instalar repetidoras do alarme (visual e sonoro) no hall social de todos os pavimentos.','Item 5.4.6.1, NT 17/CBMPE'));
      if(radio('compartilha-uso')==='nao'){
        out.push(item('Abrangência das medidas no pavimento','info','O pavimento não compartilha uso com outras ocupações de permanência humana: a detecção e os chuveiros podem ser previstos apenas nos pavimentos onde houver SAVE. Os demais pavimentos seguem só as medidas da própria ocupação — mas o alarme de incêndio deve permanecer interligado e abranger toda a edificação.','Item 5.4.7, NT 17/CBMPE'));
      }else if(radio('compartimentacao')==='sim'){
        out.push(item('Abrangência das medidas no pavimento','info','Há compartimentação horizontal resistente ao fogo (NT 1.04) entre a garagem e os demais ambientes: a detecção e os chuveiros podem ficar restritos à área da garagem. O alarme de incêndio deve permanecer interligado e abranger toda a edificação.','Item 5.4.8, alíneas a e c, NT 17/CBMPE'));
      }else{
        out.push(item('Abrangência das medidas no pavimento','required','Não há compartimentação horizontal resistente ao fogo entre a garagem e os demais ambientes do pavimento: a detecção e os chuveiros precisam abranger TODO o pavimento, não apenas a área das vagas com SAVE. O alarme de incêndio deve permanecer interligado e abranger toda a edificação.','Item 5.4.8, alíneas b e c, NT 17/CBMPE'));
      }
    }
  }

  // ---- Item 5.5: eletroposto comercial ----
  if(eletroposto&&s){
    out.push(item('Extintores nas estações de carregamento','required','As estações de carregamento devem ser protegidas por extintores com capacidade extintora mínima de 4-A:40B:C. Um extintor pode proteger mais de uma estação, desde que o caminhamento até ele não ultrapasse 15 metros.','Item 5.5.4, NT 17/CBMPE e Art. 42 do COSCIP'));
    out.push(item('Regime aplicável ao eletroposto','info',ext?'A norma manda exigir os sistemas conforme as características da edificação (itens 5.3/5.4) e, quando o ponto de recarga estiver em área ou garagem externa, atender ao item 5.2. Como as vagas informadas ficam em área externa, o regime aplicável é o do item 5.2: valem as regras gerais do item 5.1 (chaves de desligamento, sinalização) mais os afastamentos de riscos específicos — sem as exigências de detecção, chuveiros, extração e TRRF das garagens internas.':(sit==='nova'?'A norma manda exigir os sistemas conforme as características da edificação. Como aqui há garagem interna em edificação nova, aplica-se o item 5.3: detecção sem detector de fumaça, chuveiros classe C de resposta rápida, RTI, extração mecânica e TRRF de 120 minutos — todos já listados acima.':'A norma manda exigir os sistemas conforme as características da edificação. Como aqui há garagem interna em edificação existente com SAVE, aplica-se o item 5.4: chuveiros, detecção e alarme e a regra de abrangência no pavimento — todos já listados acima.'),'Item 5.5.3, NT 17/CBMPE'));
  }

  // ---- Itens 5.6 e 5.7: projeto e vistoria ----
  if(s){
    out.push(item('O que indicar na planta baixa','info','No projeto de segurança contra incêndio, indicar: a localização da estação de recarga e dos pontos de desligamento local, do pavimento e geral (simbologia do Anexo A); as vagas proibidas de instalação de estações; as cotas de afastamento do ponto de desligamento em relação à estação e à saída de emergência; a localização das repetidoras de alarme no hall social; o atendimento ao TRRF de 120 min nas áreas de garagem (edificação nova); a localização e o detalhamento do sistema de extração mecânica, com memória de cálculo; e os parâmetros e a localização da detecção e dos chuveiros automáticos.','Item 5.6.1.1, NT 17/CBMPE'));
    out.push(item('Documento de responsabilidade técnica (vistoria)','required','A instalação do SAVE deve ser executada por profissional habilitado, que emitirá documento de responsabilidade técnica registrado no conselho de classe contendo, no campo "Observações", exatamente: "As instalações e serviços realizados para o Sistema de Alimentação de Veículos Elétricos (SAVE) atendem integralmente ao previsto na NT 17 do CBMPE".','Itens 5.7.1 e 5.7.2, NT 17/CBMPE'));
    out.push(item('Execução parcial das estações no AVCB','info','Para emitir o AVCB, o CBMPE não exige que todas as estações de SAVE previstas no projeto já estejam executadas no ato da vistoria técnica.','Item 5.7.3, NT 17/CBMPE'));
    out.push(item('Recarga de micromobilidade','info','É expressamente proibido recarregar bicicletas elétricas, patinetes e equipamentos similares de micromobilidade dentro de rotas de fuga, escadas de emergência e antecâmaras. Nesses equipamentos, a recarga deve seguir as instruções do fabricante, observadas tensão e corrente.','Item 7.3, NT 17/CBMPE'));
  }

  return out;
}

function tabelaHtml(chave){
  var q=base&&base.rtiQuadros&&base.rtiQuadros[chave];if(!q)return'';
  return'<div class="sp-tabela"><table><caption>'+esc(q.titulo)+'</caption><thead><tr>'+q.colunas.map(function(c){return'<th>'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>'+q.linhas.map(function(l){return'<tr>'+l.map(function(v){return'<td>'+esc(v)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody>'+(q.nota?'<tfoot><tr><td colspan="'+q.colunas.length+'">'+esc(q.nota)+'</td></tr></tfoot>':'')+'</table></div>';
}
function figuraHtml(chave){
  var f=base&&base.figuras&&base.figuras[chave];if(!f)return'';
  return'<figure class="sp-fig"><img src="'+esc(f.arquivo)+'" alt="'+esc(f.alt)+'" loading="lazy"><figcaption>'+esc(f.legenda)+'</figcaption></figure>';
}
function card(x){
  var tag={required:'Exigido',check:'Verificar',no:'Dispensado',info:'Informativo'}[x.status];
  return'<article class="sp-result '+(x.status==='required'?'':x.status)+'"><div class="sp-result-head"><h3>'+esc(x.name)+'</h3><span class="sp-tag">'+tag+'</span></div><p>'+esc(x.motivo)+'</p>'+(x.tabela?tabelaHtml(x.tabela):'')+(x.figura?figuraHtml(x.figura):'')+'<p class="ref">'+esc(x.ref)+'</p></article>';
}

function calculate(){
  var list=assess(),req=list.filter(function(x){return x.status==='required'}),check=list.filter(function(x){return x.status==='check'}),info=list.filter(function(x){return x.status==='info'}),no=list.filter(function(x){return x.status==='no'});
  var reqInfo=req.concat(info),d=localDef(),cl=classe();
  var rotulosClasse={interna:'Garagem interna — regime dos itens 5.3/5.4',externa:'Área externa — regime do item 5.2','sem-garagem':'Sem vagas — apenas ponto de recarga'};
  $('perfil').innerHTML='<strong>'+esc(situacao()==='nova'?'Edificação nova':'Edificação existente')+' · '+esc(rotulosClasse[cl]||'')+'</strong><br>'+esc(d?d.rotulo:'')+'<br>SAVE: '+esc((base.temSaveOpcoes.find(function(x){return x.valor===temSave()})||{}).rotulo||'—')+($('modo-recarga').value?' · Modo '+esc($('modo-recarga').value):'');
  var uniBanner=$('unifamiliar-banner');
  if(yes('unifamiliar')){uniBanner.className='sp-note';uniBanner.innerHTML='<strong>Residência unifamiliar:</strong> a lista abaixo é recomendada como boa prática, mas não é obrigatória para o licenciamento desta edificação (itens 2.b e 7.1 da NT 17).';uniBanner.classList.remove('sp-hidden')}else{uniBanner.classList.add('sp-hidden')}
  var isentoBanner=$('isento-banner');
  if(naoAplica()){isentoBanner.innerHTML='<strong>A NT 17 não acrescenta exigência ao caso informado.</strong> Sem SAVE instalado ou previsto e sem garagem interna.';isentoBanner.classList.remove('sp-hidden')}else{isentoBanner.classList.add('sp-hidden')}
  $('resumo').innerHTML='<span class="sp-pill req">'+req.length+' itens exigidos</span>'+(info.length?'<span class="sp-pill info">'+info.length+' orientações</span>':'')+'<span class="sp-pill check">'+check.length+' verificações complementares</span><span class="sp-pill no">'+no.length+' dispensados/não acionados</span>';
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
