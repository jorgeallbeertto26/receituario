// Apps Script do Portal de Receituário (modos: Google Sheets e E-mail).
// Configurações do projeto > Propriedades do script:
//   TOKEN       = segredo longo e aleatório (obrigatório)
//   REPO_EMAIL  = (opcional) e-mail que recebe as receitas; se vazio, usa a própria conta que executa o script
var ABA = "Receitas";
var MEDICO_NOME = "Dr. Vinícius Assis"; // aparece no assunto do e-mail ao paciente

function autorizar() { MailApp.getRemainingDailyQuota(); } // rode uma vez para conceder a permissão de envio

function _prop(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function _ok(t) { var k = _prop("TOKEN"); return !!k && t === k; }
function _out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function _s(x) { x = String(x == null ? "" : x); return /^[=+\-@]/.test(x) ? "'" + x : x; } // evita injeção de fórmulas
function _e(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function _line(s) { return String(s == null ? "" : s).replace(/[\r\n]+/g, " ").substring(0, 120); } // sem quebras de linha (evita injeção em cabeçalhos)

// ---------- Google Sheets ----------
function _sh() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  if (s.getLastRow() == 0) s.appendRow(["id", "versao", "criadoEm", "atualizadoEm", "status", "paciente", "json"]);
  return s;
}

// ---------- E-mail ----------
function _pdfHtml(d) {
  var head = d.head || {}, foot = d.foot || {};
  var h = '<html><body style="font-family:Arial,sans-serif;font-size:11pt;color:#000">';
  h += '<div style="text-align:center"><div style="font-size:21pt;font-weight:bold;color:#333">' + _e(String(head.nome || "").toUpperCase()) +
       '</div><div style="font-size:9.5pt;font-weight:bold;color:#333">' + _e(String(head.esp || "").toUpperCase()) + '</div></div><br>';
  (d.blocks || []).slice(0, 300).forEach(function (b) {
    if (b.k == "sp") { h += '<div style="height:' + Math.min(+b.h || 0, 80) + 'px"></div>'; return; }
    if (b.k != "p") return;
    h += '<p style="margin:' + (b.mt ? 14 : 0) + 'px 0 4px ' + (b.ind ? 18 : 0) + 'px;text-align:' + (b.al == "c" ? "center" : "left") +
         ';font-size:' + Math.min(+b.sz || 11, 30) + 'pt;font-weight:' + (b.b ? "bold" : "normal") + '">' + _e(b.t) + '</p>';
  });
  h += '<br><table width="100%" style="border-collapse:collapse"><tr><td align="center" bgcolor="#2b3a5c" style="background:#2b3a5c;color:#ffffff;padding:12px;font-size:10pt;font-weight:bold">' +
       _e(foot.insta) + '<br>' + _e(foot.unidades) + '</td></tr></table></body></html>';
  return h;
}

function _enviar(b) {
  var r = b.rec || {}, id = _line(r.id), nome = _line(r.nome), ver = Math.max(1, +r.versao || 1), email = String(r.email || "").trim();
  if (!/^REC-\d{8}-[A-Z0-9]{6}$/.test(id)) return { ok: false, erro: "ID inválido" };
  if (!nome) return { ok: false, erro: "nome do paciente ausente" };
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) return { ok: false, erro: "e-mail do paciente inválido" };
  if (!b.docx || String(b.docx).length > 3000000) return { ok: false, erro: "anexo ausente ou grande demais" };
  if (MailApp.getRemainingDailyQuota() < 2) return { ok: false, erro: "cota diária de e-mails esgotada" };
  var nasc = /^\d{4}-\d{2}-\d{2}$/.test(r.nasc || "") ? r.nasc.split("-").reverse().join("/") : "não informado";
  var emis = /^\d{4}-\d{2}-\d{2}$/.test(r.data || "") ? r.data.split("-").reverse().join("/") : "";
  var base = String(b.arquivo || id).replace(/[^A-Za-z0-9_\-]/g, "_").substring(0, 80);
  var pdf = Utilities.newBlob(_pdfHtml(b.doc || {}), "text/html", "r.html").getAs("application/pdf").setName(base + ".pdf");
  var docx = Utilities.newBlob(Utilities.base64Decode(b.docx), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", base + ".docx");
  var repo = _prop("REPO_EMAIL") || Session.getEffectiveUser().getEmail();

  MailApp.sendEmail({
    to: repo, name: "Portal de Receituário",
    subject: id + " · v" + ver + " · " + nome,
    body: "Receita emitida\n\nID: " + id + "\nVersão: " + ver + "\nPaciente: " + nome + "\nNascimento: " + nasc +
          "\nData de emissão: " + emis + "\nE-mail do paciente: " + email + "\n\nAnexos: PDF e Word.",
    attachments: [pdf, docx]
  });
  var res = { ok: true, paciente: false };
  try {
    MailApp.sendEmail({
      to: email, name: "Consultório " + MEDICO_NOME,
      subject: "Sua receita – " + MEDICO_NOME,
      body: "Olá,\n\nSegue em anexo a sua receita (ref. " + id + ").\n\nEste e-mail contém informações de saúde e é destinado somente a você. " +
            "Se o recebeu por engano, avise o consultório e apague a mensagem.\n\n" + MEDICO_NOME,
      attachments: [pdf]
    });
    res.paciente = true;
  } catch (err) { res.erroPaciente = "falha ao enviar ao paciente"; }
  return res;
}

// ---------- Web app ----------
function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (!_ok(b.token)) return _out({ ok: false, erro: "não autorizado" });
    if (b.acao == "enviar") return _out(_enviar(b));
    var r = b.rec;
    _sh().appendRow([_s(r.id), r.versao, _s(r.criadoEm), _s(r.atualizadoEm), _s(r.status), _s(r.paciente && r.paciente.nome), JSON.stringify(r)]);
    return _out({ ok: true });
  } catch (err) { return _out({ ok: false, erro: "erro" }); }
}
function doGet(e) {
  if (!_ok(e.parameter.token)) return _out({ ok: false, erro: "não autorizado" });
  if (e.parameter.acao == "ping") return _out({ ok: true, cota: MailApp.getRemainingDailyQuota() });
  var v = _sh().getDataRange().getValues(); v.shift();
  return _out({ ok: true, rows: v });
}
