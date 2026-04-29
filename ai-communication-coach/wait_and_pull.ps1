$containerName = "ai_coach_ollama"
$modelName = "llama3.2"

Write-Host "Waiting for container $containerName to start..."
while ($true) {
    $status = docker ps --filter "name=$containerName" --format "{{.Status}}"
    if ($status -match "Up") {
        Write-Host "Container is up. Pulling $modelName..."
        docker exec $containerName ollama pull $modelName
        Write-Host "Model pulled successfully."
        break
    }
    Start-Sleep -Seconds 5
}
