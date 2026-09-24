# ==============================================================================
# RideFlow: Automated Driver Companion Simulation Script
# Simulates live driver actions in real-time while you watch your Rider phone app!
# ==============================================================================

$baseUrl = "https://rideflow-production-06dc.up.railway.app/api"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [🚖] RideFlow Driver Companion Simulation" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Authenticate Rider to find your active booked ride
Write-Host "[1/5] Checking for your booked ride on mobile..." -ForegroundColor Cyan
try {
    $riderAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"rider@rideflow.test","password":"Password@123"}'
    $riderToken = $riderAuth.token

    $activeRide = Invoke-RestMethod -Uri "$baseUrl/rides/rider/active" -Method Get -Headers @{ Authorization = "Bearer $riderToken" }
} catch {
    Write-Host "Failed to connect to server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if (-not $activeRide -or -not $activeRide.id) {
    Write-Host "No active ride found for rider@rideflow.test!" -ForegroundColor Yellow
    Write-Host "Step 1: On your mobile app, sign in as rider@rideflow.test" -ForegroundColor White
    Write-Host "Step 2: Choose a destination and tap 'Confirm Ride'" -ForegroundColor White
    Write-Host "Step 3: Run this script again: .\simulate-driver.ps1" -ForegroundColor Green
    Write-Host ""
    exit 0
}

$rideId = $activeRide.id
$otp = $activeRide.otp
$pickup = $activeRide.pickupAddress
$dropoff = $activeRide.dropoffAddress
$status = $activeRide.status

Write-Host "Active Ride Found! (ID: #$rideId)" -ForegroundColor Green
Write-Host "   From:   $pickup" -ForegroundColor Gray
Write-Host "   To:     $dropoff" -ForegroundColor Gray
Write-Host "   Status: $status" -ForegroundColor Gray
Write-Host "   OTP:    $otp" -ForegroundColor Yellow
Write-Host ""

# 2. Authenticate Driver
Write-Host "[2/5] Signing in as Driver Partner (Suresh Kumar)..." -ForegroundColor Cyan
$driverAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"driver@rideflow.test","password":"Password@123"}'
$driverToken = $driverAuth.token
$driverHeader = @{ Authorization = "Bearer $driverToken" }

# 3. Accept Ride
if ($status -eq "REQUESTED") {
    Write-Host "[3/5] Driver accepting Ride #$rideId..." -ForegroundColor Cyan
    try {
        $accepted = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId/accept" -Method Post -Headers $driverHeader
        Write-Host "-> Ride #$rideId ACCEPTED! Look at your phone - Driver matched!" -ForegroundColor Green
        Start-Sleep -Seconds 3
    } catch {
        Write-Host "Notice accepting ride: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 4. Mark Arrived at Pickup
Write-Host "[4/5] Driver arriving at pickup location..." -ForegroundColor Cyan
try {
    $arrived = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId/arrived" -Method Post -Headers $driverHeader
    Write-Host "-> Driver ARRIVED! Look at your phone - 'Driver has arrived outside'!" -ForegroundColor Green
    Start-Sleep -Seconds 3
} catch {
    Write-Host "Notice on driver arrival: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. Enter OTP & Start Trip
Write-Host "[5/5] Entering Rider OTP ($otp) to start trip..." -ForegroundColor Cyan
try {
    $body = @{ otp = "$otp" } | ConvertTo-Json
    $started = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId/start" -Method Post -Headers $driverHeader -ContentType "application/json" -Body $body
    Write-Host "-> TRIP STARTED! Look at your phone - Ride is now IN PROGRESS!" -ForegroundColor Green
    Start-Sleep -Seconds 4
} catch {
    Write-Host "Notice starting trip: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6. Complete Trip
Write-Host "Reached destination! Completing Ride #$rideId..." -ForegroundColor Cyan
try {
    $completed = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId/complete" -Method Post -Headers $driverHeader
    Write-Host ""
    Write-Host "TRIP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Check your phone to rate the trip and view the fare receipt!" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "Notice completing trip: $($_.Exception.Message)" -ForegroundColor Yellow
}
