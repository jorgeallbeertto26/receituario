# Protótipo do Portal de Receituário (dados FICTÍCIOS)

Arquivo: `receituario.html` (não está linkado no site público; abra pelo endereço direto, mesma pasta do `index.html`).

## Funciona sem configurar nada
- Editor, pré-visualização A4, copiar formatado (Word), baixar .docx, imprimir/PDF.
- Histórico com ID único, busca, versões e "nova baseada nesta"; modelos reutilizáveis.
- Salva neste navegador (somente testes).

## Opção Google Sheets (gratuita)
1. Crie uma planilha no Google Sheets (conta própria, com verificação em duas etapas).
2. Extensões > Apps Script. Cole o conteúdo de `apps-script/Code.gs`.
3. Configurações do projeto > Propriedades do script > adicione `TOKEN` com um segredo longo aleatório.
4. Implantar > Nova implantação > Tipo "App da Web" > Executar como: você > Quem tem acesso: Qualquer pessoa. Copie a URL `/exec`.
5. No portal: Configurações > modo Google Sheets, cole a URL e o token > Testar conexão.

## Opção E-mail: caixa de receitas + cópia ao paciente
1. Crie uma conta Google **só para receitas** (ex.: Gmail gratuito). Ative verificação em duas etapas com chave de segurança/passkey (ideal: Programa de Proteção Avançada), desative POP/IMAP, encaminhamento automático e delegação.
2. Logada nessa conta, abra script.google.com > Novo projeto e cole `apps-script/Code.gs`.
3. Configurações do projeto > Propriedades do script: `TOKEN` (segredo longo e aleatório). Opcional: `REPO_EMAIL` (se quiser que as receitas cheguem a outra caixa).
4. Execute a função `autorizar` uma vez e conceda a permissão de envio de e-mail.
5. Implantar > Nova implantação > App da Web > Executar como: você > Quem tem acesso: Qualquer pessoa. Copie a URL `/exec`. (Ao alterar o código, crie nova versão da implantação.)
6. No portal: Configurações > modo "E-mail", cole URL e token > Testar conexão (mostra a cota de envios do dia).
7. Em Nova receita: informe o e-mail do paciente **duas vezes**, marque a confirmação e clique **Emitir e enviar**.

O que é enviado:
- **Caixa de receitas:** assunto `REC-AAAAMMDD-XXXXXX · v1 · Nome do paciente`; corpo com nascimento, data e e-mail do paciente; anexos PDF e Word.
- **Paciente:** assunto "Sua receita – Dr. Vinícius Assis"; somente o PDF.
- O PDF é gerado pelo Google a partir de HTML simples: o layout pode diferir do preview (o rodapé não fica fixo no fim da página). Confira um envio de teste antes de usar.
- Nada fica gravado no navegador. Reabrir uma receita antiga não é possível pelo portal: pesquise na caixa pelo ID. Correções: use "Criar nova versão" na mesma sessão (gera `v2`).

## Limites (leia antes de usar)
- E-mail não é cofre: pode ser apagado, não tem trilha de auditoria e o assunto não é criptografado. Defina retenção e faça exportação periódica (ex.: Google Takeout).
- E-mail digitado errado envia a receita à pessoa errada; por isso a digitação dupla e a confirmação. O envio não tem assinatura digital: é cópia, não substitui a prescrição oficial quando exigida.
- Quem tiver a URL e o token lê/grava tudo; não há login por usuário, MFA, auditoria nem criptografia sob seu controle.
- O token vai na URL das consultas (pode aparecer em logs). Sheets não é banco de dados clínico.
- Não há assinatura digital; o documento é para edição/impressão e assinatura manual.
- Para pacientes reais: backend + banco seguro + LGPD + validação regulatória (CFM/Anvisa).
