/**
 * LÓGICA DO FRONTEND
 * Mesma interface e comportamento do sistema original, adaptado para
 * chamar api() (fetch) em vez de google.script.run.
 */
var mapNomeIdFunc={};var listaDocumentosCache=[];var listaTreinamentosCache=[];var listaFuncionariosCache=[];var fotoBase64=null,fotoMime=null;var anexoEmailBase64=null,anexoEmailMime=null,anexoEmailNome=null;

// ---------------------------------------------------------------------
// PWA - registra o service worker (necessário para "instalar" o app)
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW falhou:', e); });
  });
}

// ---------------------------------------------------------------------
// LOGIN / BOOTSTRAP
// ---------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', function () {
  iniciarLogin(function (usuario) {
    // valida no backend chamando qualquer endpoint leve
    api('getDashboard').then(function (res) {
      if (!res.sucesso) {
        document.getElementById('erro-acesso').style.display = 'block';
        document.getElementById('erro-acesso').textContent = res.mensagem || 'Acesso não autorizado.';
        return;
      }
      document.getElementById('tela-login').style.display = 'none';
      document.getElementById('app-shell').style.display = 'block';
      document.getElementById('usuario-nome').textContent = usuario.email || usuario.name || '';
      document.getElementById('num-total').textContent = res.data.total;
      document.getElementById('num-vigentes').textContent = res.data.vigentes;
      document.getElementById('num-vencer').textContent = res.data.aVencer;
      document.getElementById('num-vencidos').textContent = res.data.vencidos;
      desenharGrafico(res.data);
    });
  });
});

function showToast(mensagem,tipo){var toast=document.createElement('div');toast.className='toast '+(tipo||'success');toast.textContent=mensagem;document.body.appendChild(toast);setTimeout(function(){toast.remove()},5000)}
function onErr(err){showToast('Erro: '+(err&&err.message?err.message:err),'error')}

// ---------------------------------------------------------------------
// NAVEGAÇÃO
// ---------------------------------------------------------------------
function navegar(page){
document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active')});
document.getElementById('page-'+page).classList.add('active');
document.querySelector('[data-page="'+page+'"]').classList.add('active');
if(page==='dashboard')carregarDashboard();
if(page==='documentos'){carregarDocumentos();carregarNomesFuncionarios()}
if(page==='treinamentos'){carregarTreinamentos();carregarNomesFuncionarios()}
if(page==='funcionarios')carregarFuncionarios();
if(page==='email')carregarConversas();
}

function navegarSubTab(tab){
document.querySelectorAll('.sub-tab').forEach(function(t){t.classList.remove('active')});
document.querySelectorAll('.sub-content').forEach(function(c){c.classList.remove('active')});
document.getElementById('tab-'+tab).classList.add('active');
document.getElementById('sub-'+tab).classList.add('active');
if(tab==='entrada')carregarConversas();
}

// ---------------------------------------------------------------------
// FUNCIONÁRIOS/EMPRESAS (selects)
// ---------------------------------------------------------------------
function carregarNomesFuncionarios(callback){
api('getNomesFuncionarios').then(function(res){
var nomes=res.data||[];
mapNomeIdFunc={};nomes.forEach(function(f){mapNomeIdFunc[f.nome]=f.id});
var selectTre=document.getElementById('tre-idfunc');
selectTre.innerHTML='<option value="">Selecione...</option>';
nomes.forEach(function(f){selectTre.innerHTML+='<option value="'+f.id+'">'+f.nome+'</option>'});
api('getNomesEmpresas').then(function(res2){
var empresas=res2.data||[];
var selectDoc=document.getElementById('doc-idfunc');
var docVal=selectDoc.value;
selectDoc.innerHTML='<option value="">Selecione...</option>';
if(nomes.length>0){selectDoc.innerHTML+='<optgroup label="👥 Funcionários">';nomes.forEach(function(f){selectDoc.innerHTML+='<option value="'+f.id+'">'+f.nome+'</option>'});selectDoc.innerHTML+='</optgroup>'}
if(empresas.length>0){selectDoc.innerHTML+='<optgroup label="🏢 Empresas">';empresas.forEach(function(e){selectDoc.innerHTML+='<option value="'+e.id+'">'+e.nome+'</option>'});selectDoc.innerHTML+='</optgroup>'}
selectDoc.innerHTML+='<option value="__empresa__">🏢 Outra (digitar)</option>';
if(docVal)selectDoc.value=docVal;
if(callback)callback();
}).catch(onErr);
}).catch(onErr);
}

function toggleEmpresaField(){var select=document.getElementById('doc-idfunc');var wrapper=document.getElementById('doc-empresa-wrapper');if(select.value==='__empresa__'){wrapper.style.display='block'}else{wrapper.style.display='none';document.getElementById('doc-empresa-nome').value=''}}

function atualizarTiposSugeridos(){
var tiposDoc=[];listaDocumentosCache.forEach(function(d){if(d.tipoDoc&&tiposDoc.indexOf(d.tipoDoc)===-1)tiposDoc.push(d.tipoDoc)});
['CNH','AVCB','CERTIFICADO','CONTRATO','EXAME MÉDICO','EXAME ASO','LICENÇA','LICENÇA AMBIENTAL','APROVAÇÃO'].forEach(function(t){if(tiposDoc.indexOf(t)===-1)tiposDoc.push(t)});
document.getElementById('lista-tipos-doc').innerHTML=tiposDoc.map(function(t){return'<option value="'+t+'">'}).join('');
var tiposTre=[];listaTreinamentosCache.forEach(function(t){if(t.tipoTreinamento&&tiposTre.indexOf(t.tipoTreinamento)===-1)tiposTre.push(t.tipoTreinamento)});
['NR-10','NR-11','NR-18','NR-20','NR-33','NR-35','PRIMEIROS SOCORROS','DIREÇÃO DEFENSIVA'].forEach(function(t){if(tiposTre.indexOf(t)===-1)tiposTre.push(t)});
document.getElementById('lista-tipos-tre').innerHTML=tiposTre.map(function(t){return'<option value="'+t+'">'}).join('');
}

// ---------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------
google.charts.load('current',{packages:['corechart']});
function carregarDashboard(){
api('getDashboard').then(function(res){
var data=res.data;
document.getElementById('num-total').textContent=data.total;
document.getElementById('num-vigentes').textContent=data.vigentes;
document.getElementById('num-vencer').textContent=data.aVencer;
document.getElementById('num-vencidos').textContent=data.vencidos;
desenharGrafico(data);
}).catch(onErr);
}
function desenharGrafico(data){if(data.total===0){document.getElementById('chart_div').innerHTML='<div style="text-align:center;padding:50px;color:#999;font-size:17px"><span style="font-size:48px">📭</span><br>Nenhum dado cadastrado ainda.</div>';return}var chartData=google.visualization.arrayToDataTable([['Status','Quantidade',{role:'style'}],['✅ Vigentes',data.vigentes,'#43a047'],['⚠️ À Vencer',data.aVencer,'#fb8c00'],['🔴 Vencidos',data.vencidos,'#e53935']]);var options={title:'Distribuição de Vencimentos',titleTextStyle:{fontSize:18,color:'#1a237e'},legend:{position:'none'},chartArea:{width:'80%',height:'70%'},animation:{startup:true,duration:800},vAxis:{minValue:0,format:'0',textStyle:{fontSize:15}},hAxis:{textStyle:{fontSize:15}}};new google.visualization.ColumnChart(document.getElementById('chart_div')).draw(chartData,options)}

// ---------------------------------------------------------------------
// DOCUMENTOS
// ---------------------------------------------------------------------
function mostrarFormDoc(){document.getElementById('form-doc').style.display='block';document.getElementById('form-doc-title').textContent='📄 Novo Documento';document.getElementById('doc-id').value='';document.getElementById('doc-idfunc').value='';document.getElementById('doc-tipo').value='';document.getElementById('doc-vencimento').value='';document.getElementById('doc-observacao').value='';document.getElementById('doc-empresa-nome').value='';document.getElementById('doc-empresa-wrapper').style.display='none';carregarNomesFuncionarios()}
function editarDocumento(id){var doc=listaDocumentosCache.find(function(d){return d.id===id});if(!doc){showToast('❌ Documento não encontrado!','error');return}carregarNomesFuncionarios(function(){document.getElementById('form-doc').style.display='block';document.getElementById('form-doc-title').textContent='✏️ Editar Documento';document.getElementById('doc-id').value=doc.id||'';var selectFunc=document.getElementById('doc-idfunc');var wrapper=document.getElementById('doc-empresa-wrapper');if(doc.idFunc&&doc.idFunc!==''){selectFunc.value=doc.idFunc;wrapper.style.display='none'}else{selectFunc.value='__empresa__';wrapper.style.display='block';document.getElementById('doc-empresa-nome').value=doc.nome||''}document.getElementById('doc-tipo').value=doc.tipoDoc||'';document.getElementById('doc-vencimento').value=doc.vencimento||'';document.getElementById('doc-observacao').value=doc.observacao||'';document.getElementById('form-doc').scrollIntoView({behavior:'smooth',block:'center'})})}
function cancelarFormDoc(){document.getElementById('form-doc').style.display='none'}
function salvarDocumento(){
var selectFunc=document.getElementById('doc-idfunc');var selectVal=selectFunc.value;var idFunc='',nome='';
if(selectVal==='__empresa__'){nome=document.getElementById('doc-empresa-nome').value.trim();idFunc=''}
else if(selectVal){idFunc=selectVal;nome=selectFunc.options[selectFunc.selectedIndex].text}
var dados={id:document.getElementById('doc-id').value,idFunc:idFunc,tipoDoc:document.getElementById('doc-tipo').value.trim(),nome:nome,vencimento:document.getElementById('doc-vencimento').value,observacao:document.getElementById('doc-observacao').value};
if(!dados.nome||!dados.tipoDoc||!dados.vencimento){showToast('⚠️ Preencha os campos obrigatórios!','error');return}
api('salvarDocumento',dados).then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');if(res.sucesso){cancelarFormDoc();carregarDocumentos();carregarFuncionarios()}}).catch(onErr);
}

function carregarDocumentos(){
api('getDocumentos').then(function(res){
var docs=res.data||[];
listaDocumentosCache=docs;
renderDocumentos(docs);
try{
var sf=document.getElementById('filtro-doc-tipo');
var cv=sf.value;
var tipos=[];
docs.forEach(function(d){if(d.tipoDoc&&tipos.indexOf(d.tipoDoc)===-1)tipos.push(d.tipoDoc)});
tipos.sort();
sf.innerHTML='<option value="">Todos os tipos</option>';
tipos.forEach(function(t){sf.innerHTML+='<option value="'+t+'">'+t+'</option>'});
sf.value=cv;
}catch(e){}
}).catch(onErr);
}

function filtrarDocumentos(){var busca=(document.getElementById('filtro-doc-busca').value||'').toLowerCase();var fT=document.getElementById('filtro-doc-tipo').value;var fS=document.getElementById('filtro-doc-status').value;var filtrados=listaDocumentosCache.filter(function(d){var mB=!busca||(d.id&&d.id.toLowerCase().indexOf(busca)!==-1)||(d.tipoDoc&&d.tipoDoc.toLowerCase().indexOf(busca)!==-1)||(d.nome&&d.nome.toLowerCase().indexOf(busca)!==-1)||(d.observacao&&d.observacao.toLowerCase().indexOf(busca)!==-1)||(d.status&&d.status.toLowerCase().indexOf(busca)!==-1);var mT=!fT||d.tipoDoc===fT;var mS=!fS||(d.status&&d.status.indexOf(fS)!==-1);return mB&&mT&&mS});renderDocumentos(filtrados)}
function renderDocumentos(docs){
try{
if(!docs)docs=[];
document.getElementById('doc-filter-count').textContent=docs.length+' de '+listaDocumentosCache.length+' registro(s)';
var tbody=document.getElementById('tbody-docs');
if(docs.length===0){tbody.innerHTML='<tr><td colspan="8" class="empty-state"><span class="emoji">🔍</span>Nenhum documento encontrado.</td></tr>';return}
tbody.innerHTML=docs.map(function(d){var dataFmt=d.vencimento?formatDateBR(d.vencimento):'—';var sc=d.status&&d.status.indexOf('Vigente')!==-1?'status-vigente':d.status&&d.status.indexOf('Vencer')!==-1?'status-vencer':'status-vencido';return'<tr><td style="font-family:monospace;font-size:12px;color:#888">'+(d.id||'—')+'</td><td><strong>'+(d.tipoDoc||'—')+'</strong></td><td>'+(d.nome||'—')+'</td><td>'+dataFmt+'</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">'+(d.observacao||'—')+'</td><td><span class="status-badge '+sc+'">'+(d.status||'—')+'</span></td><td>'+(d.dias!==null&&d.dias!==undefined?d.dias+' dias':'—')+'</td><td><div class="btn-group"><button class="btn btn-warning btn-sm" onclick="editarDocumento(\''+d.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirDocumento(\''+d.id+'\')">🗑️</button></div></td></tr>'}).join('');
}catch(e){showToast('Erro ao renderizar: '+e.message,'error')}
}
function excluirDocumento(id){if(!confirm('Tem certeza que deseja excluir este documento?'))return;api('excluirDocumento',{id:id}).then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');carregarDocumentos();carregarFuncionarios()}).catch(onErr)}

// ---------------------------------------------------------------------
// TREINAMENTOS
// ---------------------------------------------------------------------
function mostrarFormTre(){document.getElementById('form-tre').style.display='block';document.getElementById('form-tre-title').textContent='🎓 Novo Treinamento';document.getElementById('tre-id').value='';document.getElementById('tre-idfunc').value='';document.getElementById('tre-tipo').value='';document.getElementById('tre-realizacao').value='';document.getElementById('tre-vencimento').value='';document.getElementById('tre-observacao').value='';carregarNomesFuncionarios()}
function editarTreinamento(id){var tre=listaTreinamentosCache.find(function(t){return t.id===id});if(!tre){showToast('❌ Treinamento não encontrado!','error');return}carregarNomesFuncionarios(function(){document.getElementById('form-tre').style.display='block';document.getElementById('form-tre-title').textContent='✏️ Editar Treinamento';document.getElementById('tre-id').value=tre.id||'';if(tre.idFunc)document.getElementById('tre-idfunc').value=tre.idFunc;document.getElementById('tre-tipo').value=tre.tipoTreinamento||'';document.getElementById('tre-realizacao').value=tre.dataRealizacao||'';document.getElementById('tre-vencimento').value=tre.dataVencimento||'';document.getElementById('tre-observacao').value=tre.observacao||'';document.getElementById('form-tre').scrollIntoView({behavior:'smooth',block:'center'})})}
function cancelarFormTre(){document.getElementById('form-tre').style.display='none'}
function salvarTreinamento(){
var selectFunc=document.getElementById('tre-idfunc');var idFunc=selectFunc.value;var nomeFunc=selectFunc.options[selectFunc.selectedIndex].text;
var dados={id:document.getElementById('tre-id').value,idFunc:idFunc,nome:nomeFunc,tipoTreinamento:document.getElementById('tre-tipo').value.trim(),dataRealizacao:document.getElementById('tre-realizacao').value,dataVencimento:document.getElementById('tre-vencimento').value,observacao:document.getElementById('tre-observacao').value};
if(!idFunc||!dados.tipoTreinamento||!dados.dataVencimento){showToast('⚠️ Preencha os campos obrigatórios!','error');return}
api('salvarTreinamento',dados).then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');if(res.sucesso){cancelarFormTre();carregarTreinamentos();carregarFuncionarios()}}).catch(onErr);
}
function carregarTreinamentos(){
api('getTreinamentos').then(function(res){
var tres=res.data||[];
listaTreinamentosCache=tres;
renderTreinamentos(tres);
try{
var sf=document.getElementById('filtro-tre-tipo');
var cv=sf.value;
var tipos=[];
tres.forEach(function(t){if(t.tipoTreinamento&&tipos.indexOf(t.tipoTreinamento)===-1)tipos.push(t.tipoTreinamento)});
tipos.sort();
sf.innerHTML='<option value="">Todos os tipos</option>';
tipos.forEach(function(t){sf.innerHTML+='<option value="'+t+'">'+t+'</option>'});
sf.value=cv;
}catch(e){}
}).catch(onErr);
}
function filtrarTreinamentos(){var busca=(document.getElementById('filtro-tre-busca').value||'').toLowerCase();var fT=document.getElementById('filtro-tre-tipo').value;var fS=document.getElementById('filtro-tre-status').value;var filtrados=listaTreinamentosCache.filter(function(t){var mB=!busca||(t.id&&t.id.toLowerCase().indexOf(busca)!==-1)||(t.nome&&t.nome.toLowerCase().indexOf(busca)!==-1)||(t.tipoTreinamento&&t.tipoTreinamento.toLowerCase().indexOf(busca)!==-1)||(t.observacao&&t.observacao.toLowerCase().indexOf(busca)!==-1)||(t.status&&t.status.toLowerCase().indexOf(busca)!==-1);var mT=!fT||t.tipoTreinamento===fT;var mS=!fS||(t.status&&t.status.indexOf(fS)!==-1);return mB&&mT&&mS});renderTreinamentos(filtrados)}
function renderTreinamentos(tres){
try{
if(!tres)tres=[];
document.getElementById('tre-filter-count').textContent=tres.length+' de '+listaTreinamentosCache.length+' registro(s)';
var tbody=document.getElementById('tbody-tres');
if(tres.length===0){tbody.innerHTML='<tr><td colspan="8" class="empty-state"><span class="emoji">🔍</span>Nenhum treinamento encontrado.</td></tr>';return}
tbody.innerHTML=tres.map(function(t){var rF=t.dataRealizacao?formatDateBR(t.dataRealizacao):'—';var vF=t.dataVencimento?formatDateBR(t.dataVencimento):'—';var sc=t.status&&t.status.indexOf('Vigente')!==-1?'status-vigente':t.status&&t.status.indexOf('Vencer')!==-1?'status-vencer':'status-vencido';return'<tr><td style="font-family:monospace;font-size:12px;color:#888">'+(t.id||'—')+'</td><td><strong>'+(t.nome||'—')+'</strong></td><td>'+rF+'</td><td>'+vF+'</td><td>'+(t.tipoTreinamento||'—')+'</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis">'+(t.observacao||'—')+'</td><td><span class="status-badge '+sc+'">'+(t.status||'—')+'</span></td><td><div class="btn-group"><button class="btn btn-warning btn-sm" onclick="editarTreinamento(\''+t.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirTreinamento(\''+t.id+'\')">🗑️</button></div></td></tr>'}).join('');
}catch(e){showToast('Erro ao renderizar: '+e.message,'error')}
}
function excluirTreinamento(id){if(!confirm('Tem certeza que deseja excluir este treinamento?'))return;api('excluirTreinamento',{id:id}).then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');carregarTreinamentos();carregarFuncionarios()}).catch(onErr)}

// ---------------------------------------------------------------------
// FUNCIONÁRIOS
// ---------------------------------------------------------------------
function mostrarFormFunc(){document.getElementById('form-func').style.display='block';document.getElementById('form-func-title').textContent='👥 Novo Funcionário';document.getElementById('func-id').value='';document.getElementById('func-nome').value='';document.getElementById('func-cpf').value='';document.getElementById('func-matricula').value='';document.getElementById('func-cargo').value='';fotoBase64=null;fotoMime=null;document.getElementById('preview-foto').style.display='none';document.getElementById('preview-foto').src='';document.getElementById('foto-atual-info').style.display='none'}
function editarFuncionario(id){var func=listaFuncionariosCache.find(function(f){return f.id===id});if(!func){showToast('❌ Funcionário não encontrado!','error');return}document.getElementById('form-func').style.display='block';document.getElementById('form-func-title').textContent='✏️ Editar Funcionário';document.getElementById('func-id').value=func.id;document.getElementById('func-nome').value=func.nome||'';document.getElementById('func-cpf').value=func.cpf||'';document.getElementById('func-matricula').value=func.matricula||'';document.getElementById('func-cargo').value=func.cargo||'';fotoBase64=null;fotoMime=null;if(func.fotoUrl){document.getElementById('preview-foto').src=func.fotoUrl;document.getElementById('preview-foto').style.display='block';document.getElementById('foto-atual-info').style.display='block'}else{document.getElementById('preview-foto').style.display='none';document.getElementById('preview-foto').src='';document.getElementById('foto-atual-info').style.display='none'}document.getElementById('form-func').scrollIntoView({behavior:'smooth',block:'center'})}
function cancelarFormFunc(){document.getElementById('form-func').style.display='none'}
function previewFoto(event){var file=event.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){document.getElementById('preview-foto').src=e.target.result;document.getElementById('preview-foto').style.display='block';document.getElementById('foto-atual-info').style.display='none';fotoBase64=e.target.result.split(',')[1];fotoMime=file.type};reader.readAsDataURL(file)}
function salvarFuncionario(){
var dados={id:document.getElementById('func-id').value,nome:document.getElementById('func-nome').value,cpf:document.getElementById('func-cpf').value,matricula:document.getElementById('func-matricula').value,cargo:document.getElementById('func-cargo').value};
if(!dados.nome||!dados.cpf){showToast('⚠️ Preencha os campos obrigatórios!','error');return}
if(fotoBase64){
api('uploadFotoFuncionario',{base64:fotoBase64,mimeType:fotoMime,nome:dados.nome}).then(function(res){if(res.sucesso){dados.fotoUrl=res.url;salvarFuncionarioDados(dados)}else{showToast('❌ Erro: '+res.mensagem,'error')}}).catch(onErr);
}else{salvarFuncionarioDados(dados)}
}
function salvarFuncionarioDados(dados){api('salvarFuncionario',dados).then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');if(res.sucesso){cancelarFormFunc();carregarFuncionarios()}}).catch(onErr)}
function carregarFuncionarios(){
api('getFuncionarios').then(function(res){
var funcs=res.data||[];
listaFuncionariosCache=funcs;
var grid=document.getElementById('func-grid');
if(funcs.length===0){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><span class="emoji">📭</span>Nenhum funcionário cadastrado.</div>';return}
grid.innerHTML=funcs.map(function(f){var avatar=f.fotoUrl?'<img class="avatar" src="'+f.fotoUrl+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="avatar-placeholder" style="display:none">👤</div>':'<div class="avatar-placeholder">👤</div>';var docsHtml=f.documentos&&f.documentos.length>0?f.documentos.map(function(d){return'<div class="item-row"><span>📄 '+d.tipo+'</span><span>'+(d.vencimento||'—')+' '+(d.status||'')+'</span></div>'}).join(''):'<div class="item-row"><span style="color:#bbb">Nenhum documento</span></div>';var treHtml=f.treinamentos&&f.treinamentos.length>0?f.treinamentos.map(function(t){return'<div class="item-row"><span>🎓 '+t.tipo+'</span><span>'+(t.vencimento||'—')+' '+(t.status||'')+'</span></div>'}).join(''):'<div class="item-row"><span style="color:#bbb">Nenhum treinamento</span></div>';return'<div class="func-card">'+avatar+'<h3>'+f.nome+'</h3><p class="func-id">ID: '+(f.id||'—')+'</p><p class="info">CPF: '+(f.cpf||'—')+'</p><p class="info">Matrícula: '+(f.matricula||'—')+' | Cargo: '+(f.cargo||'—')+'</p><div class="section-title">📄 Documentos ('+(f.documentos?f.documentos.length:0)+')</div>'+docsHtml+'<div class="section-title">🎓 Treinamentos ('+(f.treinamentos?f.treinamentos.length:0)+')</div>'+treHtml+'<div class="btn-group"><button class="btn btn-warning btn-sm" onclick="editarFuncionario(\''+f.id+'\')">✏️ Editar</button><button class="btn btn-danger btn-sm" onclick="excluirFuncionario(\''+f.id+'\')">🗑️ Excluir</button></div></div>'}).join('');
}).catch(onErr);
}
function excluirFuncionario(id){if(!confirm('Tem certeza que deseja excluir este funcionário?'))return;api('excluirFuncionario',{id:id}).then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');carregarFuncionarios()}).catch(onErr)}

// ---------------------------------------------------------------------
// E-MAIL
// ---------------------------------------------------------------------
function previewAnexoEmail(event){
var file=event.target.files[0];if(!file)return;
var reader=new FileReader();
reader.onload=function(e){
anexoEmailBase64=e.target.result.split(',')[1];
anexoEmailMime=file.type;
anexoEmailNome=file.name;
document.getElementById('anexo-email-info').textContent='📎 Arquivo selecionado: '+file.name;
document.getElementById('anexo-email-info').style.display='block';
};
reader.readAsDataURL(file);
}

function enviarEmail(){
var destinatario=document.getElementById('email-destinatario').value.trim();
var dados={destinatario:destinatario,assunto:document.getElementById('email-assunto').value,mensagem:document.getElementById('email-mensagem').value};
if(!dados.destinatario){showToast('⚠️ Digite o e-mail do destinatário!','error');return}
if(!dados.assunto||!dados.mensagem){showToast('⚠️ Preencha o assunto e a mensagem!','error');return}
if(anexoEmailBase64){dados.anexoBase64=anexoEmailBase64;dados.anexoMime=anexoEmailMime;dados.anexoNome=anexoEmailNome}
api('enviarEmailPlataforma',dados).then(function(res){
showToast(res.mensagem,res.sucesso?'success':'error');
if(res.sucesso){
document.getElementById('email-assunto').value='';
document.getElementById('email-mensagem').value='';
document.getElementById('anexo-email-info').style.display='none';
anexoEmailBase64=null;anexoEmailMime=null;anexoEmailNome=null;
carregarConversas();
}
}).catch(onErr);
}

function verificarRespostas(){showToast('🔄 Verificando respostas no Gmail...','success');api('verificarRespostasEmail').then(function(res){showToast(res.mensagem,res.sucesso?'success':'error');carregarConversas()}).catch(onErr)}

function renderAnexos(anexos){
if(!anexos||anexos.length===0)return'';
var html='<div class="conv-anexos">';
anexos.forEach(function(a){
html+='<div class="conv-anexo-item"><span>📎</span><span>'+a.nome+'</span>';
if(a.url)html+=' <a href="'+a.url+'" target="_blank" style="margin-left:8px">⬇️ Download</a>';
if(a.visualizar)html+=' <a href="'+a.visualizar+'" target="_blank" style="margin-left:8px">👁️ Visualizar</a>';
html+='</div>';
});
html+='</div>';
return html;
}

function carregarConversas(){
api('getConversasEmail').then(function(res){
var conv=res.data||[];
var inboxList=document.getElementById('inbox-list');
var recebidas=conv.filter(function(c){return c.tipo==='Recebido'});
if(inboxList){
if(recebidas.length===0){inboxList.innerHTML='<div class="empty-state"><span class="emoji">📭</span>Nenhuma resposta recebida. Clique em "Verificar Respostas" para buscar no Gmail.</div>'}
else{inboxList.innerHTML=recebidas.map(function(c){return'<div class="conv-item recebido"><div class="conv-header"><span class="conv-tipo recebido">📥 Recebido</span><span style="font-size:12px;color:#999">'+c.data+'</span></div><div class="conv-assunto">'+(c.assunto||'(sem assunto)')+'</div><div class="conv-meta">De: '+c.remetente+'</div>'+renderAnexos(c.anexos)+'<div class="conv-msg">'+(c.mensagem||'')+'</div></div>'}).join('')}
}
}).catch(onErr);
}

function formatDateBR(dateStr){if(!dateStr)return'—';var parts=dateStr.split('-');if(parts.length===3)return parts[2]+'/'+parts[1]+'/'+parts[0];return dateStr}
