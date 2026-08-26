$cols = @("dias","petsCadastro","contadores","profissionais")
foreach ($c in $cols) {
  Write-Host "Apagando $c..." -ForegroundColor Cyan
  cmd /c "firebase firestore:delete $c --recursive --force"
}
Write-Host "Reset concluido." -ForegroundColor Green
