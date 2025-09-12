# Install Supabase CLI if not already installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Supabase CLI..."
    npm install -g supabase@latest
}

# Login to Supabase if not already logged in
if (-not (supabase status)) {
    Write-Host "Please login to Supabase..."
    supabase login
}

# Deploy the generate-notes function
Write-Host "Deploying generate-notes function..."
cd supabase
supabase functions deploy generate-notes --project-ref nwrkxjbjxtctydwxxukj

Write-Host "Deployment complete!"
