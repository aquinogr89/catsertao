'use strict';

(function () {
  var dados = null;
  var ultimoResultado = [];
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var v = $(id).value; return v === '' ? null : Number(v); };
  var tem = function (v) { return v !== null && Number.isFinite(v); };

  $('site-sidebar-list').innerHTML = CatAuth.montarSidebarItens({ paginaAtual: 'sistemas', paginaBase: 'index.html' });
  CatAuth.iniciarMenuLateral();
  CatAuth.iniciarBotaoTopo();

  function matrizPorSistema(nome) {
    return dados.matriz.find(function (m) { return m.sistema === nome; });
  }

  function resultado(matriz, status, motivo) {
    return { sistema: matriz.sistema, referencia: matriz.referencia, criterio: matriz.porTipo[$('sp-tipo').value] || '—', status: status, motivo: motivo };
  }

  function limiteOuPendente(valores, testes) {
    var disparou = false, informou = false;
    testes.forEach(function (teste, i) {
      if (tem(valores[i])) { informou = true; if (teste(valores[i])) disparou = true; }
    });
    return disparou ? 'required' : (informou ? 'not-required' : 'check');
  }

  function avaliar(m, e) {
    var t = e.tipo, h = e.altura, p = e.pavimentos, a = e.area, ap = e.areaPav, l = e.lotacao, glp = e.glp;
    var s = m.sistema;
    if (s === 'Hidrante Público (Vilas)') return resultado(m, t === 'A' ? 'check' : 'info', t === 'A' ? 'Aplicável a vilas; informe/verifique a quantidade de unidades.' : 'Regra específica para vilas do Tipo A.');
    if (s === 'Extintor') return resultado(m, t === 'A' ? 'check' : 'required', t === 'A' ? 'Tipo A tem isenção geral, ressalvados o Art. 41 e as NTs.' : 'Exigência geral para a ocupação selecionada.');
    if (s === 'Sinalização de Emergência') return resultado(m, t === 'A' ? 'not-required' : (t === 'Q' ? 'check' : 'required'), t === 'Q' ? 'Aplicar a NT específica.' : 'Critério direto da matriz.');
    if (s === 'Elevador de Emergência') {
      var se = limiteOuPendente([p], [function(v){return v > 20;}]);
      if (t === 'A') se = 'not-required';
      return resultado(m, se, se === 'required' ? 'Mais de 20 pavimentos.' : 'Depende do número de pavimentos.');
    }
    if (s === 'SPDA (Para-raios)') {
      var ss = t === 'A' ? 'check' : limiteOuPendente([a,h],[function(v){return v>1500;},function(v){return v>20;}]);
      return resultado(m, ss, ss === 'required' ? 'Área coberta acima de 1.500 m² ou altura acima de 20 m.' : 'O laudo de gerenciamento de risco e outras normas podem alterar a conclusão.');
    }
    if (s === 'Hidrante') {
      if (t === 'A') return resultado(m,'not-required','Isenção geral do Tipo A.');
      var usaArea = ['D','E','F','G','H','I','J','L','M','N','O','P','Q'].indexOf(t) >= 0;
      var sh = limiteOuPendente(usaArea?[h,p,a]:[h,p], usaArea?[function(v){return v>14;},function(v){return v>4;},function(v){return v>930;}]:[function(v){return v>14;},function(v){return v>4;}]);
      if (t === 'J' || t === 'Q') sh = sh === 'required' ? sh : 'check';
      return resultado(m,sh,sh==='required'?'Um ou mais gatilhos de altura, pavimentos ou área foram atingidos.':'Compare todos os parâmetros do critério.');
    }
    if (s === 'Chuveiros Automáticos') {
      if (['A','B','K','P'].indexOf(t)>=0) return resultado(m,t==='A'?'not-required':'check',t==='B'?'Pode ser exigido em garagem interna que não atenda ao Art. 27.':'Há exceções e gatilhos especiais no Art. 132-A.');
      if (['J','O','Q'].indexOf(t)>=0) return resultado(m,'check','A ocupação exige análise por regra ou NT específica.');
      var limite = (['C','I','M'].indexOf(t)>=0) ? ((tem(ap)&&ap>930)?4:8) : (t==='H'?2:((tem(ap)&&ap>930)?2:4));
      var sc = tem(p) ? (p>limite?'required':'not-required') : 'check';
      return resultado(m,sc,sc==='required'?'Número de pavimentos ultrapassa o limite para a área por pavimento informada.':'Verifique também garagem interna, público e armazenamento previstos nos §§4º–6º.');
    }
    if (s === 'Alarme Manual') {
      if (t === 'A') return resultado(m,'not-required','Isenção geral do Tipo A.');
      var alturas={B:51,C:8,E:7,G:7,H:7,K:7,L:9,M:20,O:9,P:7};
      var gatilho=(t!=='B'&&tem(a)&&a>2000)||(alturas[t]&&tem(h)&&h>=alturas[t]);
      var faltam=!tem(a)&&!tem(h);
      return resultado(m,gatilho?'required':(faltam?'check':'not-required'),gatilho?'Gatilho de área ou altura atingido. Também é conjugado a hidrantes/chuveiros.':'Também é exigido de forma conjugada quando houver hidrantes ou chuveiros.');
    }
    if (s === 'Detecção e Alarme') {
      var regras={D:[1500,12,4],E:[1000,12,4],F:[1500,12,4],G:[1000,9,3],H:[1500,9,3],I:[1500,8,null],K:[null,12,4],L:[2000,null,null],M:[3000,null,null]};
      if (!regras[t]) return resultado(m,['J','O','Q'].indexOf(t)>=0?'check':'not-required',['J','O','Q'].indexOf(t)>=0?'Aplicar ocupação correspondente ou norma específica.':'A matriz não traz gatilho próprio para este tipo.');
      var r=regras[t], sd=((r[0]&&tem(a)&&a>r[0])||(r[1]&&tem(h)&&h>r[1])||(r[2]&&tem(p)&&p>r[2]))?'required':((tem(a)||tem(h)||tem(p))?'not-required':'check');
      return resultado(m,sd,sd==='required'?'Um dos gatilhos de área, altura ou pavimentos foi atingido.':'Confira todos os parâmetros aplicáveis.');
    }
    if (s === 'Central de GLP') {
      if (t === 'A') return resultado(m,'check','Isenção geral, ressalvadas as NTs aplicáveis.');
      if (['J','Q'].indexOf(t)>=0) return resultado(m,'check','Critério definido pelo CBMPE no caso concreto.');
      var sg=(tem(glp)&&glp>=45)||(tem(h)&&h>20)||(tem(p)&&p>8);
      return resultado(m,sg?'required':((tem(glp)||tem(h)||tem(p))?'not-required':'check'),sg?'Ao menos um gatilho geral foi atingido.':'Hotéis/restaurantes/panificadoras e hospitais/clínicas/escolas têm gatilhos adicionais por área.');
    }
    if (s === 'Iluminação de Emergência') {
      if (t === 'A') return resultado(m,'not-required','Isenção geral do Tipo A.');
      var si=(tem(l)&&l>100)||(tem(a)&&a>1500);
      return resultado(m,si?'required':'check',si?'Gatilho de lotação ou área atingido.':'Também é obrigatória sempre que houver escada EP ou PF.');
    }
    if (s === 'Área de Refúgio') {
      if (['C','D','F','I'].indexOf(t)<0) return resultado(m,['J','Q'].indexOf(t)>=0?'check':'not-required','Exigência direta apenas para C, D, F e I; J/Q dependem do enquadramento.');
      if (!tem(ap)||(!tem(h)&&!tem(p))) return resultado(m,'check','Informe área por pavimento e altura ou pavimentos.');
      var baixo=ap<=750, grupoCI=['C','I'].indexOf(t)>=0, req=grupoCI?(baixo?((h||0)>20||(p||0)>8):((h||0)>12||(p||0)>4)):(baixo?((h||0)>120||(p||0)>40):((h||0)>60||(p||0)>20));
      return resultado(m,req?'required':'not-required',req?'Gatilho do Art. 173 atingido.':'Parâmetros informados abaixo dos gatilhos diretos do Art. 173.');
    }
    if (s === 'Escadas (NE/EP/PF)') return resultado(m,t==='A'?'not-required':(t==='Q'?'check':'info'),t==='Q'?'Aplicar NT específica.':'A matriz indica o tipo de escada pela altura; confira também população, distâncias e quantidade de saídas.');
    if (s === 'Unidade de Passagem') return resultado(m,t==='A'?'not-required':'info','Dimensionar pela população conforme a Tabela 1; o valor exibido é apenas o mínimo.');
    if (s === 'Heliponto') return resultado(m,'info','Instalação facultativa; se adotada, deve atender à NT aplicável.');
    return resultado(m,'info','Consulte o critério da matriz e o detalhamento normativo.');
  }

  function rotulo(status) { return {required:'Exigido', 'not-required':'Não indicado', check:'Verificar', info:'Dimensionar'}[status]; }
  function render(lista) {
    var busca = CatAuth.normalizar($('sp-search').value);
    var filtrada = lista.filter(function (r) { return CatAuth.normalizar(r.sistema+' '+r.criterio+' '+r.referencia).indexOf(busca)>=0; });
    $('sp-results').innerHTML = filtrada.length ? filtrada.map(function(r){return '<article class="sp-card '+r.status+'"><div class="sp-card-head"><h3>'+CatAuth.escapeHtml(r.sistema)+'</h3><span class="sp-status">'+rotulo(r.status)+'</span></div><p>'+CatAuth.escapeHtml(r.motivo)+'</p><p><strong>Critério da ocupação:</strong> '+CatAuth.escapeHtml(r.criterio)+'</p><p class="sp-ref">'+CatAuth.escapeHtml(r.referencia)+'</p></article>';}).join('') : '<div class="sp-empty">Nenhum sistema corresponde ao filtro.</div>';
  }

  function consultar(e) {
    if (e) e.preventDefault();
    var tipo=$('sp-tipo').value;if(!tipo){$('sp-tipo').focus();return;}
    var entrada={tipo:tipo,altura:num('sp-altura'),pavimentos:num('sp-pavimentos'),area:num('sp-area'),areaPav:num('sp-area-pav'),lotacao:num('sp-lotacao'),glp:num('sp-glp')};
    ultimoResultado=dados.matriz.map(function(m){return avaliar(m,entrada);});
    var counts={required:0,check:0,info:0,'not-required':0};ultimoResultado.forEach(function(r){counts[r.status]++;});
    $('sp-summary').innerHTML='<span class="sp-count required">'+counts.required+' exigidos</span><span class="sp-count check">'+counts.check+' a verificar</span><span class="sp-count info">'+counts.info+' para dimensionar</span><span class="sp-count">'+counts['not-required']+' não indicados</span>';
    var oc=dados.ocupacoes.find(function(o){return o.tipo===tipo;});
    $('sp-occupation').innerHTML='<h3>Tipo '+oc.tipo+' — '+CatAuth.escapeHtml(oc.classificacao)+'</h3><p>'+CatAuth.escapeHtml(oc.exemplos)+'</p><p><strong>Atenção:</strong> '+CatAuth.escapeHtml(oc.observacoes)+'</p>';
    CatAuth.show($('sp-occupation'));CatAuth.show($('sp-output'));render(ultimoResultado);
  }

  function iniciar(base, session) {
    dados=base;
    base.ocupacoes.forEach(function(o){var op=document.createElement('option');op.value=o.tipo;op.textContent=o.tipo+' — '+o.classificacao;$('sp-tipo').appendChild(op);});
    CatAuth.aplicarPerfil(session);CatAuth.hide($('loading-shell'));CatAuth.show($('site-shell'));
    CatAuth.iniciarMonitorInatividade(function(){location.reload();});
    $('sp-form').addEventListener('submit',consultar);$('sp-search').addEventListener('input',function(){render(ultimoResultado);});
    $('sp-limpar').addEventListener('click',function(){$('sp-form').reset();CatAuth.hide($('sp-output'));CatAuth.hide($('sp-occupation'));ultimoResultado=[];});
    $('sp-imprimir').addEventListener('click',function(){if(!ultimoResultado.length)consultar();if(ultimoResultado.length)window.print();});
  }

  Promise.all([CatAuth.requireSession(),fetch('content/sistemas-preventivos.json').then(function(r){if(!r.ok)throw new Error('base');return r.json();})]).then(function(v){iniciar(v[1],v[0]);}).catch(function(err){CatAuth.hide($('loading-msg'));var txt=$('denied-text');txt.textContent=err&&err.code==='network_error'?'Sem conexão — não foi possível validar a sessão.':(err&&['no_session','invalid_session'].indexOf(err.code)>=0?'Faça login no site principal antes de acessar esta página.':'Não foi possível carregar a base de sistemas preventivos.');CatAuth.show($('denied-box'));});
})();
