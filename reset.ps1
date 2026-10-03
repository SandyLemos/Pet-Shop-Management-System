# ATENCAO: apaga colecoes do banco REAL (pet-shop-manegement).
# Uso: npm run reset            (apaga dias, petsCadastro, contadores e profissionais)
#      npm run reset:dias       (apaga so a colecao indicada)
param([string[]]$Colecoes = @("dias", "petsCadastro", "contadores", "profissionais"))

$projeto = "pet-shop-manegement"
$permitidas = @("dias", "petsCadastro", "contadores", "profissionais")

foreach ($c in $Colecoes) {
  if ($permitidas -notcontains $c) {
    Write-Host "Colecao desconhecida: $c. Nada foi apagado." -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "ATENCAO: isto APAGA DEFINITIVAMENTE do banco REAL da loja ($projeto):" -ForegroundColor Red
foreach ($c in $Colecoes) { Write-Host "   - $c" -ForegroundColor Yellow }
Write-Host "Antes, baixe um backup: Painel Admin > Relatorios > Baixar backup." -ForegroundColor Yellow
Write-Host ""
$resposta = Read-Host "Para confirmar, digite o nome do projeto ($projeto)"

if ($resposta -cne $projeto) {
  Write-Host "Cancelado. Nada foi apagado." -ForegroundColor Green
  exit 1
}

foreach ($c in $Colecoes) {
  Write-Host "Apagando $c..." -ForegroundColor Cyan
  cmd /c "firebase firestore:delete $c --recursive --force"
}
Write-Host "Reset concluido." -ForegroundColor Green
