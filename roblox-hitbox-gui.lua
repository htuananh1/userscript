--[[
    ╔══════════════════════════════════════════════╗
    ║         Hoàng Anh Hub v11 — FULL CODE        ║
    ║  ESP Box + Name + HP Text + Skeleton + Tracer ║
    ║  Aimbot + FOV + Prediction + WallCheck        ║
    ║  Hitbox + Speed + InfJump                     ║
    ╚══════════════════════════════════════════════╝
    
    Menu: 4 tab (ESP | AIM | PLAYER | MISC)
    Toggle: nút HA hoặc RightShift
]]

-- ═══════════════════════════════════════════════════════
-- SERVICES
-- ═══════════════════════════════════════════════════════
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local Camera = workspace.CurrentCamera

-- ═══════════════════════════════════════════════════════
-- CONFIG
-- ═══════════════════════════════════════════════════════
local CFG = {
    HubName = "Hoàng Anh",
    Version = "v11",

    -- ESP
    EspEnabled = false,
    EspBox = true,
    EspName = true,
    EspHP = true,
    EspHPText = true,        -- Hiển thị số máu "75/100"
    EspSkeleton = true,       -- NEW: Khung xương
    EspMeters = true,
    EspTracer = false,
    EspColor = Color3.fromRGB(255, 50, 50),
    EspSkeletonColor = Color3.fromRGB(255, 255, 0),
    EspTracerColor = Color3.fromRGB(0, 255, 100),

    -- AIMBOT
    AimEnabled = false,
    AimFOV = 200,
    AimSmooth = 1,           -- 1 = instant lock
    AimWallCheck = false,  -- Tắt mặc định (nhiều game raycast fail)
    AimOnShoot = false,
    AimShowFOV = true,
    AimPart = "Head",
    AimPrediction = true,     -- NEW: Dự đoán vị trí
    AimPredAmount = 0.15,     -- Tăng prediction

    -- PLAYER
    InfJump = false,
    Speed = 32,
    SpeedEnabled = false,

    -- MISC
    HitboxSize = 2,
}

-- ═══════════════════════════════════════════════════════
-- STATE
-- ═══════════════════════════════════════════════════════
local espData = {}           -- [Player] = { drawing objects }
local isShooting = false
local menuVisible = true

-- ═══════════════════════════════════════════════════════
-- UTILITY: World → Screen
-- ═══════════════════════════════════════════════════════
local function worldToScreen(worldPos)
    local vec, onScreen = Camera:WorldToViewportPoint(worldPos)
    return Vector2.new(vec.X, vec.Y), onScreen, vec.Z
end

-- ═══════════════════════════════════════════════════════
-- SKELETON BONE DEFINITIONS
-- Hỗ trợ cả R15 và R6
-- ═══════════════════════════════════════════════════════
local SKELETON_BONES = {
    -- R15 bones
    {from = "Head",             to = "UpperTorso"},
    {from = "UpperTorso",       to = "LowerTorso"},
    {from = "UpperTorso",       to = "LeftUpperArm"},
    {from = "UpperTorso",       to = "RightUpperArm"},
    {from = "LeftUpperArm",     to = "LeftLowerArm"},
    {from = "RightUpperArm",    to = "RightLowerArm"},
    {from = "LeftLowerArm",     to = "LeftHand"},
    {from = "RightLowerArm",    to = "RightHand"},
    {from = "LowerTorso",       to = "LeftUpperLeg"},
    {from = "LowerTorso",       to = "RightUpperLeg"},
    {from = "LeftUpperLeg",     to = "LeftLowerLeg"},
    {from = "RightUpperLeg",    to = "RightLowerLeg"},
    {from = "LeftLowerLeg",     to = "LeftFoot"},
    {from = "RightLowerLeg",    to = "RightFoot"},
    -- R6 fallback bones
    {from = "Head",             to = "Torso"},
    {from = "Torso",            to = "Left Arm"},
    {from = "Torso",            to = "Right Arm"},
    {from = "Torso",            to = "Left Leg"},
    {from = "Torso",            to = "Right Leg"},
}

-- ═══════════════════════════════════════════════════════
-- ESP: Tạo Drawing objects cho 1 player
-- ═══════════════════════════════════════════════════════
local function createPlayerEsp(player)
    if player == LocalPlayer then return end

    local d = {}

    -- BOX: dùng 4 Line (tương thích nhiều executor hơn Square)
    d.boxTop    = Drawing.new("Line")
    d.boxBottom = Drawing.new("Line")
    d.boxLeft   = Drawing.new("Line")
    d.boxRight  = Drawing.new("Line")

    for _, line in pairs({d.boxTop, d.boxBottom, d.boxLeft, d.boxRight}) do
        line.Visible = false
        line.Color = CFG.EspColor
        line.Thickness = 1.5
        line.Transparency = 1
        line.ZIndex = 10
    end

    -- NAME text (trên đầu)
    d.name = Drawing.new("Text")
    d.name.Visible = false
    d.name.Center = true
    d.name.Outline = true
    d.name.OutlineColor = Color3.new(0, 0, 0)
    d.name.Color = CFG.EspColor
    d.name.Size = 14
    d.name.Font = 2
    d.name.ZIndex = 11

    -- HP BAR background (bên trái box) — dùng Line cho tương thích executor
    d.hpBg = Drawing.new("Line")
    d.hpBg.Visible = false
    d.hpBg.Color = Color3.fromRGB(20, 20, 20)
    d.hpBg.Thickness = 4
    d.hpBg.Transparency = 0.6
    d.hpBg.ZIndex = 9

    -- HP BAR fill (bên trái box, mọc từ dưới lên) — dùng Line
    d.hpBar = Drawing.new("Line")
    d.hpBar.Visible = false
    d.hpBar.Color = Color3.fromRGB(0, 255, 0)
    d.hpBar.Thickness = 4
    d.hpBar.Transparency = 0.9
    d.hpBar.ZIndex = 10

    -- HP TEXT (hiển thị số "75/100" bên phải box)
    d.hpText = Drawing.new("Text")
    d.hpText.Visible = false
    d.hpText.Center = false
    d.hpText.Outline = true
    d.hpText.OutlineColor = Color3.new(0, 0, 0)
    d.hpText.Color = Color3.fromRGB(0, 255, 0)
    d.hpText.Size = 12
    d.hpText.Font = 2
    d.hpText.ZIndex = 11

    -- METER text (khoảng cách dưới chân)
    d.meter = Drawing.new("Text")
    d.meter.Visible = false
    d.meter.Center = true
    d.meter.Outline = true
    d.meter.OutlineColor = Color3.new(0, 0, 0)
    d.meter.Color = Color3.fromRGB(200, 200, 200)
    d.meter.Size = 11
    d.meter.Font = 2
    d.meter.ZIndex = 11

    -- TRACER line (dây từ dưới màn hình lên player)
    d.tracer = Drawing.new("Line")
    d.tracer.Visible = false
    d.tracer.Color = CFG.EspTracerColor
    d.tracer.Thickness = 1.2
    d.tracer.Transparency = 0.7
    d.tracer.ZIndex = 5

    -- SKELETON lines (mỗi bone = 1 line)
    d.skeletonLines = {}
    for i, bone in ipairs(SKELETON_BONES) do
        local line = Drawing.new("Line")
        line.Visible = false
        line.Color = CFG.EspSkeletonColor
        line.Thickness = 1.5
        line.Transparency = 0.9
        line.ZIndex = 8
        d.skeletonLines[i] = {
            line = line,
            fromName = bone.from,
            toName = bone.to,
        }
    end

    d.player = player
    espData[player] = d
end

-- ═══════════════════════════════════════════════════════
-- ESP: Xóa Drawing objects khi player rời
-- ═══════════════════════════════════════════════════════
local function removePlayerEsp(player)
    local d = espData[player]
    if not d then return end

    pcall(function() d.boxTop:Remove() end)
    pcall(function() d.boxBottom:Remove() end)
    pcall(function() d.boxLeft:Remove() end)
    pcall(function() d.boxRight:Remove() end)
    pcall(function() d.name:Remove() end)
    pcall(function() d.hpBg:Remove() end)
    pcall(function() d.hpBar:Remove() end)
    pcall(function() d.hpText:Remove() end)
    pcall(function() d.meter:Remove() end)
    pcall(function() d.tracer:Remove() end)

    for _, skel in ipairs(d.skeletonLines) do
        pcall(function() skel.line:Remove() end)
    end

    espData[player] = nil
end

-- ═══════════════════════════════════════════════════════
-- ESP: Ẩn tất cả drawing objects của 1 player
-- ═══════════════════════════════════════════════════════
local function hidePlayerEsp(d)
    d.boxTop.Visible = false
    d.boxBottom.Visible = false
    d.boxLeft.Visible = false
    d.boxRight.Visible = false
    d.name.Visible = false
    d.hpBg.Visible = false
    d.hpBar.Visible = false
    d.hpText.Visible = false
    d.meter.Visible = false
    d.tracer.Visible = false
    for _, skel in ipairs(d.skeletonLines) do
        skel.line.Visible = false
    end
end

-- ═══════════════════════════════════════════════════════
-- ESP: Ẩn tất cả (khi tắt ESP)
-- ═══════════════════════════════════════════════════════
local function hideAllEsp()
    for _, d in pairs(espData) do
        hidePlayerEsp(d)
    end
end

-- ═══════════════════════════════════════════════════════
-- ESP: Cập nhật mỗi frame
-- ═══════════════════════════════════════════════════════
local function updateEsp()
    local myChar = LocalPlayer.Character
    local myHRP = myChar and myChar:FindFirstChild("HumanoidRootPart")

    for player, d in pairs(espData) do
        -- Nếu ESP tắt, ẩn hết
        if not CFG.EspEnabled then
            hidePlayerEsp(d)
            continue
        end

        local char = player.Character
        local hum = char and char:FindFirstChildOfClass("Humanoid")
        local head = char and char:FindFirstChild("Head")
        local hrp = char and char:FindFirstChild("HumanoidRootPart")

        -- Không có character hoặc đã chết → ẩn
        if not char or not hum or hum.Health <= 0 or not head or not hrp then
            hidePlayerEsp(d)
            continue
        end

        -- ─── Tính vị trí 2D ───
        -- Head position (trên cùng)
        local headScreen, headOnScreen = worldToScreen(head.Position + Vector3.new(0, 0.5, 0))

        -- Feet position (dưới cùng)
        local feetY
        local leftFoot = char:FindFirstChild("LeftFoot")
        local rightFoot = char:FindFirstChild("RightFoot")
        if leftFoot and rightFoot then
            -- R15: lấy Y thấp nhất của 2 chân
            feetY = math.min(leftFoot.Position.Y, rightFoot.Position.Y)
        else
            -- R6: tính từ HRP - HipHeight
            feetY = hrp.Position.Y - hum.HipHeight * 2
        end
        local feetScreen, feetOnScreen = worldToScreen(Vector3.new(hrp.Position.X, feetY, hrp.Position.Z))

        -- Root position (giữa người)
        local rootScreen, rootOnScreen = worldToScreen(hrp.Position)

        local isVisible = headOnScreen and feetOnScreen and rootOnScreen

        -- ═══ BOX ESP (4 lines) ═══
        if CFG.EspBox and isVisible then
            local boxHeight = math.abs(feetScreen.Y - headScreen.Y)
            local boxWidth = boxHeight * 0.55
            local boxLeftX = rootScreen.X - boxWidth / 2
            local boxRightX = rootScreen.X + boxWidth / 2
            local boxTopY = headScreen.Y
            local boxBottomY = feetScreen.Y

            -- Top line
            d.boxTop.From = Vector2.new(boxLeftX, boxTopY)
            d.boxTop.To = Vector2.new(boxRightX, boxTopY)
            d.boxTop.Color = CFG.EspColor
            d.boxTop.Visible = true

            -- Bottom line
            d.boxBottom.From = Vector2.new(boxLeftX, boxBottomY)
            d.boxBottom.To = Vector2.new(boxRightX, boxBottomY)
            d.boxBottom.Color = CFG.EspColor
            d.boxBottom.Visible = true

            -- Left line
            d.boxLeft.From = Vector2.new(boxLeftX, boxTopY)
            d.boxLeft.To = Vector2.new(boxLeftX, boxBottomY)
            d.boxLeft.Color = CFG.EspColor
            d.boxLeft.Visible = true

            -- Right line
            d.boxRight.From = Vector2.new(boxRightX, boxTopY)
            d.boxRight.To = Vector2.new(boxRightX, boxBottomY)
            d.boxRight.Color = CFG.EspColor
            d.boxRight.Visible = true
        else
            d.boxTop.Visible = false
            d.boxBottom.Visible = false
            d.boxLeft.Visible = false
            d.boxRight.Visible = false
        end

        -- ═══ NAME ESP (trên đầu box) ═══
        if CFG.EspName and isVisible then
            d.name.Text = player.DisplayName or player.Name
            d.name.Position = Vector2.new(rootScreen.X, headScreen.Y - 18)
            d.name.Color = CFG.EspColor
            d.name.Visible = true
        else
            d.name.Visible = false
        end

        -- ═══ HP BAR (bên trái box, mọc từ dưới lên, dùng Line) ═══
        if CFG.EspHP and isVisible then
            local boxHeight = math.abs(feetScreen.Y - headScreen.Y)
            local boxWidth = boxHeight * 0.55
            local barX = rootScreen.X - boxWidth / 2 - 6

            local healthPct = math.clamp(hum.Health / hum.MaxHealth, 0, 1)

            -- Background line (full height, đen mờ)
            d.hpBg.From = Vector2.new(barX, headScreen.Y)
            d.hpBg.To = Vector2.new(barX, feetScreen.Y)
            d.hpBg.Color = Color3.fromRGB(20, 20, 20)
            d.hpBg.Thickness = 4
            d.hpBg.Visible = true

            -- Fill line (mọc từ dưới lên, màu theo %)
            local fillTopY = feetScreen.Y - (boxHeight * healthPct)
            d.hpBar.From = Vector2.new(barX, fillTopY)
            d.hpBar.To = Vector2.new(barX, feetScreen.Y)
            d.hpBar.Thickness = 4

            -- Đổi màu theo máu: xanh lá > vàng > đỏ
            if healthPct > 0.6 then
                d.hpBar.Color = Color3.fromRGB(0, 255, 0)
            elseif healthPct > 0.3 then
                d.hpBar.Color = Color3.fromRGB(255, 255, 0)
            else
                d.hpBar.Color = Color3.fromRGB(255, 0, 0)
            end
            d.hpBar.Visible = true
        else
            d.hpBg.Visible = false
            d.hpBar.Visible = false
        end

        -- ═══ HP TEXT (hiển thị số "75/100" bên phải box) ═══
        if CFG.EspHPText and isVisible then
            local currentHP = math.floor(hum.Health)
            local maxHP = math.floor(hum.MaxHealth)
            local healthPct = currentHP / maxHP

            d.hpText.Text = currentHP .. "/" .. maxHP

            -- Đặt bên phải box
            local boxHeight = math.abs(feetScreen.Y - headScreen.Y)
            local boxWidth = boxHeight * 0.55
            d.hpText.Position = Vector2.new(rootScreen.X + boxWidth / 2 + 4, headScreen.Y)

            -- Đổi màu theo máu
            if healthPct > 0.6 then
                d.hpText.Color = Color3.fromRGB(0, 255, 0)
            elseif healthPct > 0.3 then
                d.hpText.Color = Color3.fromRGB(255, 255, 0)
            else
                d.hpText.Color = Color3.fromRGB(255, 0, 0)
            end
            d.hpText.Visible = true
        else
            d.hpText.Visible = false
        end

        -- ═══ METER (khoảng cách dưới chân) ═══
        if CFG.EspMeters and isVisible and myHRP then
            local dist = math.floor((myHRP.Position - hrp.Position).Magnitude)
            d.meter.Text = dist .. "m"
            d.meter.Position = Vector2.new(rootScreen.X, feetScreen.Y + 4)
            d.meter.Visible = true
        else
            d.meter.Visible = false
        end

        -- ═══ TRACER (dây từ TRÊN màn hình → giữa người) ═══
        if CFG.EspTracer and rootOnScreen then
            local screenTop = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y * 0.02)
            d.tracer.From = screenTop
            d.tracer.To = rootScreen
            d.tracer.Color = CFG.EspTracerColor
            d.tracer.Visible = true
        else
            d.tracer.Visible = false
        end

        -- ═══ SKELETON ESP (nối xương) ═══
        if CFG.EspSkeleton and isVisible then
            for _, skel in ipairs(d.skeletonLines) do
                local partFrom = char:FindFirstChild(skel.fromName)
                local partTo = char:FindFirstChild(skel.toName)

                if partFrom and partTo then
                    local fromScreen, fromOnScreen = worldToScreen(partFrom.Position)
                    local toScreen, toOnScreen = worldToScreen(partTo.Position)

                    if fromOnScreen and toOnScreen then
                        skel.line.From = fromScreen
                        skel.line.To = toScreen
                        skel.line.Color = CFG.EspSkeletonColor
                        skel.line.Visible = true
                    else
                        skel.line.Visible = false
                    end
                else
                    skel.line.Visible = false
                end
            end
        else
            for _, skel in ipairs(d.skeletonLines) do
                skel.line.Visible = false
            end
        end
    end
end

-- ═══════════════════════════════════════════════════════
-- AIMBOT: Kiểm tra có nhìn thấy target không (wall check)
-- ═══════════════════════════════════════════════════════
local function isPartVisible(targetPart)
    if not CFG.AimWallCheck then return true end

    local myChar = LocalPlayer.Character
    if not myChar or not myChar:FindFirstChild("Head") then return false end

    local origin = Camera.CFrame.Position
    local direction = targetPart.Position - origin
    local distance = direction.Magnitude

    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {myChar}

    local result = workspace:Raycast(origin, direction, params)
    if result then
        -- Nếu trúng 1 part thuộc character target → visible
        local hitChar = result.Instance:FindFirstAncestorOfClass("Model")
        if hitChar and hitChar:FindFirstChildOfClass("Humanoid") then
            return true  -- trúng player khác → visible
        end
        return false  -- trúng tường/object → bị block
    end
    return true  -- không bị chặn
end

-- ═══════════════════════════════════════════════════════
-- AIMBOT: Lấy bộ phận aim trên character
-- ═══════════════════════════════════════════════════════
local function getAimPart(char)
    if CFG.AimPart == "Head" then
        return char:FindFirstChild("Head")
    elseif CFG.AimPart == "Torso" then
        return char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso")
    else
        return char:FindFirstChild("HumanoidRootPart")
    end
end

-- ═══════════════════════════════════════════════════════
-- AIMBOT: Tìm player gần nhất trong FOV
-- ═══════════════════════════════════════════════════════
local function getTarget()
    local bestTarget = nil
    local bestDist = CFG.AimFOV
    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)

    for _, player in pairs(Players:GetPlayers()) do
        if player == LocalPlayer then continue end
        if not player.Character then continue end

        local hum = player.Character:FindFirstChildOfClass("Humanoid")
        local part = getAimPart(player.Character)

        if not part or not hum or hum.Health <= 0 then continue end

        local screenPos, onScreen = Camera:WorldToViewportPoint(part.Position)
        if not onScreen then continue end

        local screenPoint = Vector2.new(screenPos.X, screenPos.Y)
        local dist = (screenPoint - screenCenter).Magnitude

        if dist < bestDist and isPartVisible(part) then
            bestDist = dist
            bestTarget = {
                part = part,
                player = player,
                character = player.Character,
            }
        end
    end

    return bestTarget
end

-- ═══════════════════════════════════════════════════════
-- AIMBOT: Aim vào target (với prediction)
-- ═══════════════════════════════════════════════════════
local function aimAt(target)
    if not target or not target.part then return end

    local myChar = LocalPlayer.Character
    if not myChar then return end

    local aimPos = target.part.Position

    -- Prediction: dự đoán vị trí dựa trên velocity + deltaTime
    if CFG.AimPrediction and target.character then
        local hrp = target.character:FindFirstChild("HumanoidRootPart")
        if hrp then
            local velocity = hrp.AssemblyLinearVelocity or hrp.Velocity
            local dist = (hrp.Position - Camera.CFrame.Position).Magnitude
            -- Prediction amount tăng theo khoảng cách
            local predFactor = CFG.AimPredAmount * math.clamp(dist / 50, 0.5, 3)
            aimPos = aimPos + velocity * predFactor
        end
    end

    -- Aim: tạo CFrame nhìn từ camera vào target
    local camPos = Camera.CFrame.Position
    local goalCFrame = CFrame.new(camPos, aimPos)

    local smooth = CFG.AimSmooth
    if smooth <= 1 then
        Camera.CFrame = goalCFrame
    else
        Camera.CFrame = Camera.CFrame:Lerp(goalCFrame, 1 / smooth)
    end
end

-- FOV Circle: Frame-based (tạo sau ScreenGui)
local fovFrame = nil
local fovStroke = nil

-- AimOnShoot: poll MouseButton1 trong loop
-- ═══════════════════════════════════════════════════════
-- INFINITY JUMP
-- ═══════════════════════════════════════════════════════
UserInputService.JumpRequest:Connect(function()
    if CFG.InfJump then
        local char = LocalPlayer.Character
        if char then
            local hum = char:FindFirstChildOfClass("Humanoid")
            if hum then
                hum:ChangeState(Enum.HumanoidStateType.Jumping)
            end
        end
    end
end)

-- ═══════════════════════════════════════════════════════
-- SPEED: Áp dụng khi respawn
-- ═══════════════════════════════════════════════════════
LocalPlayer.CharacterAdded:Connect(function(char)
    task.wait(1)
    local hum = char:WaitForChild("Humanoid", 5)
    if hum then
        hum.WalkSpeed = CFG.SpeedEnabled and CFG.Speed or 16
    end
end)

-- ═══════════════════════════════════════════════════════
-- HITBOX: Áp dụng hitbox expand
-- ═══════════════════════════════════════════════════════
local function applyHitbox(char, size)
    local hrp = char:WaitForChild("HumanoidRootPart", 5)
    if hrp then
        hrp.Size = Vector3.new(size, size, size)
        hrp.Transparency = 0.7
        hrp.BrickColor = BrickColor.new("Really red")
        hrp.Material = Enum.Material.Neon
        hrp.CanCollide = false
    end
end

local function resetAllHitboxes()
    for _, player in pairs(Players:GetPlayers()) do
        if player ~= LocalPlayer and player.Character then
            local hrp = player.Character:FindFirstChild("HumanoidRootPart")
            if hrp then
                hrp.Size = Vector3.new(2, 2, 1)
                hrp.Transparency = 1
                hrp.Material = Enum.Material.Plastic
                hrp.CanCollide = false
            end
        end
    end
end

-- ═══════════════════════════════════════════════════════════════
-- GUI: SCREEN GUI + TOGGLE BUTTON
-- ═══════════════════════════════════════════════════════════════
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "HoangAnhHub"
ScreenGui.ResetOnSpawn = false
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ScreenGui.Parent = PlayerGui

-- FOV Circle: Frame + UICorner (tương thích mọi executor)
fovFrame = Instance.new("Frame")
fovFrame.Name = "FOVCircle"
fovFrame.AnchorPoint = Vector2.new(0.5, 0.5)
fovFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
fovFrame.Size = UDim2.new(0, CFG.AimFOV * 2, 0, CFG.AimFOV * 2)
fovFrame.BackgroundTransparency = 1  -- HOÀN TOÀN trong suốt, không fill
fovFrame.BorderSizePixel = 0
fovFrame.Visible = false
fovFrame.ZIndex = 999
fovFrame.Parent = ScreenGui

local fovCorner = Instance.new("UICorner")
fovCorner.CornerRadius = UDim.new(1, 0)
fovCorner.Parent = fovFrame

fovStroke = Instance.new("UIStroke")
fovStroke.Color = Color3.fromRGB(255, 255, 255)
fovStroke.Thickness = 1.5
fovStroke.Transparency = 0
fovStroke.Parent = fovFrame

-- ═══════════════════════════════════════════════════════════════
-- GUI v13: Speed Hub X Style — Sidebar + Content
-- ═══════════════════════════════════════════════════════════════
local ScreenGui2 = ScreenGui  -- reuse from FOV section

-- ─── COLORS ───
local CLR_BG        = Color3.fromRGB(17, 17, 17)       -- #111111
local CLR_PANEL      = Color3.fromRGB(30, 30, 30)       -- #1E1E1E
local CLR_PANEL2     = Color3.fromRGB(38, 38, 38)       -- #262626
local CLR_ACTIVE     = Color3.fromRGB(45, 45, 45)       -- #2D2D2D
local CLR_TEXT       = Color3.fromRGB(255, 255, 255)     -- White
local CLR_DESC       = Color3.fromRGB(176, 176, 176)     -- #B0B0B0
local CLR_ACCENT     = Color3.fromRGB(0, 120, 255)       -- Blue accent
local CLR_TOGGLE_ON  = Color3.fromRGB(0, 180, 80)        -- Green
local CLR_TOGGLE_OFF = Color3.fromRGB(70, 70, 70)        -- Gray
local CLR_DIVIDER    = Color3.fromRGB(45, 45, 45)        -- Subtle line

local MENU_W = 520
local MENU_H = 440
local SIDEBAR_W = 140

-- ═══════════════════════════════════════════════════════════════
-- TOGGLE BUTTON (HA icon)
-- ═══════════════════════════════════════════════════════════════
local ToggleBtn = Instance.new("TextButton")
ToggleBtn.Size = UDim2.new(0, 44, 0, 44)
ToggleBtn.Position = UDim2.new(0, 10, 0.5, -22)
ToggleBtn.BackgroundColor3 = CLR_PANEL
ToggleBtn.BorderSizePixel = 0
ToggleBtn.Text = "HA"
ToggleBtn.TextColor3 = CLR_ACCENT
ToggleBtn.TextSize = 17
ToggleBtn.Font = Enum.Font.GothamBold
ToggleBtn.Active = true
ToggleBtn.Draggable = true
ToggleBtn.Parent = ScreenGui2

local toggleCorner = Instance.new("UICorner")
toggleCorner.CornerRadius = UDim.new(0, 10)
toggleCorner.Parent = ToggleBtn

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = CLR_ACCENT
toggleStroke.Thickness = 2
toggleStroke.Parent = ToggleBtn

-- ═══════════════════════════════════════════════════════════════
-- MAIN FRAME
-- ═══════════════════════════════════════════════════════════════
local Main = Instance.new("Frame")
Main.Size = UDim2.new(0, MENU_W, 0, MENU_H)
Main.Position = UDim2.new(0.5, -MENU_W/2, 0.15, 0)
Main.BackgroundColor3 = CLR_BG
Main.BackgroundTransparency = 0.02
Main.BorderSizePixel = 0
Main.Active = true
Main.Draggable = true
Main.Parent = ScreenGui2

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 8)
mainCorner.Parent = Main

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = CLR_ACCENT
mainStroke.Thickness = 1
mainStroke.Transparency = 0.3
mainStroke.Parent = Main

-- ═══════════════════════════════════════════════════════════════
-- TITLE BAR
-- ═══════════════════════════════════════════════════════════════
local Title = Instance.new("Frame")
Title.Size = UDim2.new(1, 0, 0, 32)
Title.BackgroundColor3 = CLR_PANEL
Title.BorderSizePixel = 0
Title.Parent = Main

local titleCorner2 = Instance.new("UICorner")
titleCorner2.CornerRadius = UDim.new(0, 8)
titleCorner2.Parent = Title

local TitleFill = Instance.new("Frame")
TitleFill.Size = UDim2.new(1, 0, 0, 10)
TitleFill.Position = UDim2.new(0, 0, 1, -10)
TitleFill.BackgroundColor3 = CLR_PANEL
TitleFill.BorderSizePixel = 0
TitleFill.Parent = Title

local TitleText = Instance.new("TextLabel")
TitleText.Size = UDim2.new(1, -70, 1, 0)
TitleText.Position = UDim2.new(0, 12, 0, 0)
TitleText.BackgroundTransparency = 1
TitleText.Text = "Hoàng Anh Hub  |  v13"
TitleText.TextColor3 = CLR_DESC
TitleText.TextSize = 12
TitleText.Font = Enum.Font.GothamMedium
TitleText.TextXAlignment = Enum.TextXAlignment.Left
TitleText.Parent = Title

-- Minimize button
local MinBtn = Instance.new("TextButton")
MinBtn.Size = UDim2.new(0, 24, 0, 24)
MinBtn.Position = UDim2.new(1, -56, 0, 4)
MinBtn.BackgroundColor3 = CLR_PANEL2
MinBtn.BorderSizePixel = 0
MinBtn.Text = "—"
MinBtn.TextColor3 = CLR_DESC
MinBtn.TextSize = 14
MinBtn.Font = Enum.Font.GothamBold
MinBtn.Parent = Title

local minCorner = Instance.new("UICorner")
minCorner.CornerRadius = UDim.new(0, 6)
minCorner.Parent = MinBtn

-- Close button
local CloseBtn = Instance.new("TextButton")
CloseBtn.Size = UDim2.new(0, 24, 0, 24)
CloseBtn.Position = UDim2.new(1, -28, 0, 4)
CloseBtn.BackgroundColor3 = Color3.fromRGB(180, 40, 40)
CloseBtn.BorderSizePixel = 0
CloseBtn.Text = "X"
CloseBtn.TextColor3 = CLR_TEXT
CloseBtn.TextSize = 11
CloseBtn.Font = Enum.Font.GothamBold
CloseBtn.Parent = Title

local closeCorner = Instance.new("UICorner")
closeCorner.CornerRadius = UDim.new(0, 6)
closeCorner.Parent = CloseBtn

-- Status
local StatusLabel = Instance.new("TextLabel")
StatusLabel.Size = UDim2.new(1, -16, 0, 12)
StatusLabel.Position = UDim2.new(0, 12, 1, -14)
StatusLabel.BackgroundTransparency = 1
StatusLabel.Text = ""
StatusLabel.TextColor3 = Color3.fromRGB(80, 80, 80)
StatusLabel.TextSize = 9
StatusLabel.Font = Enum.Font.Gotham
StatusLabel.TextXAlignment = Enum.TextXAlignment.Left
StatusLabel.Parent = Title

-- ═══════════════════════════════════════════════════════════════
-- SIDEBAR
-- ═══════════════════════════════════════════════════════════════
local Sidebar = Instance.new("Frame")
Sidebar.Size = UDim2.new(0, SIDEBAR_W, 1, -32)
Sidebar.Position = UDim2.new(0, 0, 0, 32)
Sidebar.BackgroundColor3 = CLR_PANEL
Sidebar.BorderSizePixel = 0
Sidebar.Parent = Main

local sidebarCorner = Instance.new("UICorner")
sidebarCorner.CornerRadius = UDim.new(0, 8)
sidebarCorner.Parent = Sidebar

local SidebarFill = Instance.new("Frame")
SidebarFill.Size = UDim2.new(0, 10, 1, 0)
SidebarFill.Position = UDim2.new(1, -10, 0, 0)
SidebarFill.BackgroundColor3 = CLR_PANEL
SidebarFill.BorderSizePixel = 0
SidebarFill.ZIndex = 1
SidebarFill.Parent = Sidebar

local SidebarLayout = Instance.new("UIListLayout")
SidebarLayout.Padding = UDim.new(0, 4)
SidebarLayout.SortOrder = Enum.SortOrder.LayoutOrder
SidebarLayout.VerticalAlignment = Enum.VerticalAlignment.Top
SidebarLayout.Parent = Sidebar

local SidebarPad = Instance.new("UIPadding")
SidebarPad.PaddingTop = UDim.new(0, 6)
SidebarPad.PaddingLeft = UDim.new(0, 6)
SidebarPad.PaddingRight = UDim.new(0, 6)
SidebarPad.Parent = Sidebar

-- ═══════════════════════════════════════════════════════════════
-- CONTENT AREA
-- ═══════════════════════════════════════════════════════════════
local ContentArea = Instance.new("Frame")
ContentArea.Size = UDim2.new(1, -SIDEBAR_W, 1, -32)
ContentArea.Position = UDim2.new(0, SIDEBAR_W, 0, 32)
ContentArea.BackgroundColor3 = CLR_BG
ContentArea.BorderSizePixel = 0
ContentArea.Parent = Main

-- ═══════════════════════════════════════════════════════════════
-- SIDEBAR ITEMS
-- ═══════════════════════════════════════════════════════════════
local sidebarButtons = {}
local contentPages = {}
local menuSections = {
    {name = "Home",     icon = "🏠"},
    {name = "Main",     icon = "🎯"},
    {name = "Visual",   icon = "👁️"},
    {name = "Player",   icon = "🏃"},
    {name = "Misc",     icon = "⚙️"},
}

for i, sec in ipairs(menuSections) do
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 32)
    btn.BackgroundColor3 = CLR_PANEL
    btn.BackgroundTransparency = 1
    btn.BorderSizePixel = 0
    btn.Text = "  " .. sec.icon .. "  " .. sec.name
    btn.TextColor3 = CLR_DESC
    btn.TextSize = 12
    btn.Font = Enum.Font.GothamMedium
    btn.TextXAlignment = Enum.TextXAlignment.Left
    btn.LayoutOrder = i
    btn.ZIndex = 2
    btn.Parent = Sidebar

    local btnCorner = Instance.new("UICorner")
    btnCorner.CornerRadius = UDim.new(0, 6)
    btnCorner.Parent = btn

    sidebarButtons[sec.name] = btn

    -- Content page (ScrollingFrame)
    local page = Instance.new("ScrollingFrame")
    page.Size = UDim2.new(1, 0, 1, 0)
    page.BackgroundTransparency = 1
    page.BorderSizePixel = 0
    page.ScrollBarThickness = 3
    page.ScrollBarImageColor3 = CLR_ACCENT
    page.ScrollBarImageTransparency = 0.5
    page.CanvasSize = UDim2.new(0, 0, 0, 0)
    page.AutomaticCanvasSize = Enum.AutomaticSize.Y
    page.ScrollingDirection = Enum.ScrollingDirection.Y
    page.ElasticBehavior = Enum.ElasticBehavior.Always
    page.Visible = false
    page.Parent = ContentArea

    local pageLayout = Instance.new("UIListLayout")
    pageLayout.Padding = UDim.new(0, 0)
    pageLayout.SortOrder = Enum.SortOrder.LayoutOrder
    pageLayout.Parent = page

    local pagePad = Instance.new("UIPadding")
    pagePad.PaddingLeft = UDim.new(0, 14)
    pagePad.PaddingRight = UDim.new(0, 14)
    pagePad.PaddingTop = UDim.new(0, 10)
    pagePad.PaddingBottom = UDim.new(0, 16)
    pagePad.Parent = page

    contentPages[sec.name] = page

    btn.MouseButton1Click:Connect(function()
        for name, p in pairs(contentPages) do p.Visible = (name == sec.name) end
        for name, b in pairs(sidebarButtons) do
            if name == sec.name then
                b.BackgroundColor3 = CLR_ACTIVE
                b.BackgroundTransparency = 0
                b.TextColor3 = CLR_TEXT
            else
                b.BackgroundColor3 = CLR_PANEL
                b.BackgroundTransparency = 1
                b.TextColor3 = CLR_DESC
            end
        end
    end)
end

-- ═══════════════════════════════════════════════════════════════
-- UI COMPONENTS (per-page counter)
-- ═══════════════════════════════════════════════════════════════
local pageCounters = {}

local function nextOrder(page)
    if not pageCounters[page] then pageCounters[page] = 0 end
    pageCounters[page] = pageCounters[page] + 1
    return pageCounters[page]
end

-- Page title
local function pageTitle(page, text)
    local order = nextOrder(page)
    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(1, 0, 0, 28)
    lbl.BackgroundTransparency = 1
    lbl.Text = text
    lbl.TextColor3 = CLR_TEXT
    lbl.TextSize = 18
    lbl.Font = Enum.Font.GothamBold
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.LayoutOrder = order
    lbl.Parent = page
    return lbl
end

-- Section header: - [ Name ] -
local function sectionHeader(page, text)
    local order = nextOrder(page)
    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 28)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = order
    frame.Parent = page

    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(1, 0, 1, 0)
    lbl.BackgroundTransparency = 1
    lbl.Text = "- [ " .. text .. " ] -"
    lbl.TextColor3 = CLR_DESC
    lbl.TextSize = 11
    lbl.Font = Enum.Font.GothamMedium
    lbl.Parent = frame

    return frame
end

-- Divider line
local function divider(page)
    local order = nextOrder(page)
    local line = Instance.new("Frame")
    line.Size = UDim2.new(1, 0, 0, 1)
    line.BackgroundColor3 = CLR_DIVIDER
    line.BackgroundTransparency = 0.3
    line.BorderSizePixel = 0
    line.LayoutOrder = order
    line.Parent = page
    return line
end

-- Toggle item (label left + description + toggle right)
local function toggleItem(page, text, desc, default, callback)
    local order = nextOrder(page)
    local height = desc and 48 or 32

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, height)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = order
    frame.Parent = page

    -- Label
    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(1, -56, 0, 18)
    lbl.Position = UDim2.new(0, 0, 0, 2)
    lbl.BackgroundTransparency = 1
    lbl.Text = text
    lbl.TextColor3 = CLR_TEXT
    lbl.TextSize = 13
    lbl.Font = Enum.Font.GothamBold
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.Parent = frame

    -- Description
    if desc then
        local descLbl = Instance.new("TextLabel")
        descLbl.Size = UDim2.new(1, -56, 0, 24)
        descLbl.Position = UDim2.new(0, 0, 0, 20)
        descLbl.BackgroundTransparency = 1
        descLbl.Text = desc
        descLbl.TextColor3 = CLR_DESC
        descLbl.TextSize = 10
        descLbl.Font = Enum.Font.Gotham
        descLbl.TextXAlignment = Enum.TextXAlignment.Left
        descLbl.TextWrapped = true
        descLbl.Parent = frame
    end

    -- Toggle (pill style)
    local toggle = Instance.new("TextButton")
    toggle.Size = UDim2.new(0, 38, 0, 20)
    toggle.Position = UDim2.new(1, -42, 0, 2)
    toggle.BackgroundColor3 = default and CLR_TOGGLE_ON or CLR_TOGGLE_OFF
    toggle.BorderSizePixel = 0
    toggle.Text = ""
    toggle.Parent = frame

    local togCorner = Instance.new("UICorner")
    togCorner.CornerRadius = UDim.new(1, 0)
    togCorner.Parent = toggle

    local dot = Instance.new("Frame")
    dot.Size = UDim2.new(0, 16, 0, 16)
    dot.Position = default and UDim2.new(1, -18, 0.5, -8) or UDim2.new(0, 2, 0.5, -8)
    dot.BackgroundColor3 = CLR_TEXT
    dot.BorderSizePixel = 0
    dot.Parent = toggle

    local dotCorner = Instance.new("UICorner")
    dotCorner.CornerRadius = UDim.new(1, 0)
    dotCorner.Parent = dot

    local state = default
    toggle.MouseButton1Click:Connect(function()
        state = not state
        toggle.BackgroundColor3 = state and CLR_TOGGLE_ON or CLR_TOGGLE_OFF
        dot.Position = state and UDim2.new(1, -18, 0.5, -8) or UDim2.new(0, 2, 0.5, -8)
        callback(state)
    end)

    return frame
end

-- Input item (label left + textbox right)
local function inputItem(page, text, default, callback)
    local order = nextOrder(page)

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 32)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = order
    frame.Parent = page

    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(0.5, 0, 1, 0)
    lbl.BackgroundTransparency = 1
    lbl.Text = text
    lbl.TextColor3 = CLR_TEXT
    lbl.TextSize = 13
    lbl.Font = Enum.Font.GothamBold
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.Parent = frame

    local box = Instance.new("TextBox")
    box.Size = UDim2.new(0, 64, 0, 24)
    box.Position = UDim2.new(1, -68, 0.5, -12)
    box.BackgroundColor3 = CLR_PANEL2
    box.BorderSizePixel = 0
    box.Text = tostring(default)
    box.TextColor3 = CLR_ACCENT
    box.TextSize = 12
    box.Font = Enum.Font.GothamBold
    box.ClearTextOnFocus = false
    box.Parent = frame

    local boxCorner = Instance.new("UICorner")
    boxCorner.CornerRadius = UDim.new(0, 6)
    boxCorner.Parent = box

    box.FocusLost:Connect(function()
        local num = tonumber(box.Text)
        if num then callback(num) end
    end)

    return frame
end

-- Selector item (label left + option buttons right)
local function selectorItem(page, text, options, default, callback)
    local order = nextOrder(page)

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 32)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = order
    frame.Parent = page

    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(0.35, 0, 1, 0)
    lbl.BackgroundTransparency = 1
    lbl.Text = text
    lbl.TextColor3 = CLR_TEXT
    lbl.TextSize = 13
    lbl.Font = Enum.Font.GothamBold
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.Parent = frame

    local optBtns = {}
    for i, opt in ipairs(options) do
        local ob = Instance.new("TextButton")
        ob.Size = UDim2.new(0, 56, 0, 24)
        ob.Position = UDim2.new(0.38 + (i-1) * 0.22, 0, 0.5, -12)
        ob.BackgroundColor3 = (opt == default) and CLR_ACCENT or CLR_PANEL2
        ob.BorderSizePixel = 0
        ob.Text = opt
        ob.TextColor3 = (opt == default) and CLR_TEXT or CLR_DESC
        ob.TextSize = 11
        ob.Font = Enum.Font.GothamBold
        ob.Parent = frame
        local oc = Instance.new("UICorner")
        oc.CornerRadius = UDim.new(0, 6)
        oc.Parent = ob
        optBtns[opt] = ob
        ob.MouseButton1Click:Connect(function()
            for name, b in pairs(optBtns) do
                b.BackgroundColor3 = (name == opt) and CLR_ACCENT or CLR_PANEL2
                b.TextColor3 = (name == opt) and CLR_TEXT or CLR_DESC
            end
            callback(opt)
        end)
    end

    return frame
end

-- Dropdown item (label + dropdown button)
local function dropdownItem(page, text, options, default, callback)
    local order = nextOrder(page)
    local selected = default

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 32)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = order
    frame.Parent = page

    local lbl = Instance.new("TextLabel")
    lbl.Size = UDim2.new(0.5, 0, 1, 0)
    lbl.BackgroundTransparency = 1
    lbl.Text = text
    lbl.TextColor3 = CLR_TEXT
    lbl.TextSize = 13
    lbl.Font = Enum.Font.GothamBold
    lbl.TextXAlignment = Enum.TextXAlignment.Left
    lbl.Parent = frame

    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(0, 100, 0, 24)
    btn.Position = UDim2.new(1, -104, 0.5, -12)
    btn.BackgroundColor3 = CLR_PANEL2
    btn.BorderSizePixel = 0
    btn.Text = selected .. " ▾"
    btn.TextColor3 = CLR_TEXT
    btn.TextSize = 11
    btn.Font = Enum.Font.GothamMedium
    btn.Parent = frame

    local btnCorner = Instance.new("UICorner")
    btnCorner.CornerRadius = UDim.new(0, 6)
    btnCorner.Parent = btn

    local idx = 1
    for i, o in ipairs(options) do if o == default then idx = i end end

    btn.MouseButton1Click:Connect(function()
        idx = idx % #options + 1
        selected = options[idx]
        btn.Text = selected .. " ▾"
        callback(selected)
    end)

    return frame
end

-- Action button (full width)
local function actionItem(page, text, color, callback)
    local order = nextOrder(page)

    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 32)
    btn.BackgroundColor3 = color
    btn.BorderSizePixel = 0
    btn.Text = text
    btn.TextColor3 = CLR_TEXT
    btn.TextSize = 13
    btn.Font = Enum.Font.GothamBold
    btn.LayoutOrder = order
    btn.Parent = page

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = btn

    btn.MouseButton1Click:Connect(callback)
    return btn
end

-- ═══════════════════════════════════════════════════════════════
-- BUILD PAGES
-- ═══════════════════════════════════════════════════════════════

-- ─── HOME ───
local homePage = contentPages["Home"]
pageTitle(homePage, "Hoàng Anh Hub")
divider(homePage)
sectionHeader(homePage, "Info")
toggleItem(homePage, "Welcome!", "Nhấn nút HA hoặc RightShift để mở/tắt menu.", false, function() end)

-- ─── MAIN (Aimbot) ───
local mainPage = contentPages["Main"]
pageTitle(mainPage, "Main")
divider(mainPage)

sectionHeader(mainPage, "Config")
toggleItem(mainPage, "Aimbot", "Bật/tắt aimbot tự động ngắm player gần nhất.", false, function(s) CFG.AimEnabled = s end)
toggleItem(mainPage, "Wall Check", "Không aim xuyên tường.", true, function(s) CFG.AimWallCheck = s end)
toggleItem(mainPage, "Aim on Shoot", "Chỉ aim khi đang giữ chuột bắn.", false, function(s) CFG.AimOnShoot = s end)
toggleItem(mainPage, "Show FOV", "Hiển thị vòng FOV trên màn hình.", true, function(s) CFG.AimShowFOV = s end)
toggleItem(mainPage, "Prediction", "Dự đoán vị trí player dựa trên tốc độ.", true, function(s) CFG.AimPrediction = s end)

divider(mainPage)
sectionHeader(mainPage, "Aim Part")
selectorItem(mainPage, "Target:", {"Head", "Torso", "Root"}, "Head", function(opt)
    if opt == "Head" then CFG.AimPart = "Head"
    elseif opt == "Torso" then CFG.AimPart = "Torso"
    else CFG.AimPart = "HumanoidRootPart" end
end)

divider(mainPage)
sectionHeader(mainPage, "Settings")
inputItem(mainPage, "FOV Size:", 200, function(v) if v > 0 then CFG.AimFOV = v end end)
inputItem(mainPage, "Smooth:", 1, function(v) if v >= 1 then CFG.AimSmooth = v end end)
inputItem(mainPage, "Prediction:", 15, function(v) if v > 0 then CFG.AimPredAmount = v / 100 end end)

-- ─── VISUAL (ESP) ───
local visualPage = contentPages["Visual"]
pageTitle(visualPage, "Visual")
divider(visualPage)

sectionHeader(visualPage, "Config")
toggleItem(visualPage, "ESP", "Bật/tắt toàn bộ ESP.", false, function(s) CFG.EspEnabled = s; if not s then hideAllEsp() end end)
toggleItem(visualPage, "Box 2D", "Vẽ hộp quanh player.", true, function(s) CFG.EspBox = s end)
toggleItem(visualPage, "Name", "Hiển thị tên player.", true, function(s) CFG.EspName = s end)
toggleItem(visualPage, "Health Bar", "Thanh máu bên trái box.", true, function(s) CFG.EspHP = s end)
toggleItem(visualPage, "Health Text", "Hiển thị số máu (75/100).", true, function(s) CFG.EspHPText = s end)
toggleItem(visualPage, "Skeleton", "Hiển thị khung xương.", false, function(s) CFG.EspSkeleton = s end)
toggleItem(visualPage, "Distance", "Hiển thị khoảng cách (m).", true, function(s) CFG.EspMeters = s end)
toggleItem(visualPage, "Tracer", "Dây từ trên màn hình xuống player.", false, function(s) CFG.EspTracer = s end)

-- ─── PLAYER ───
local playerPage = contentPages["Player"]
pageTitle(playerPage, "Player")
divider(playerPage)

sectionHeader(playerPage, "Movement")
toggleItem(playerPage, "Infinity Jump", "Nhảy liên tục không giới hạn.", false, function(s) CFG.InfJump = s end)

divider(playerPage)
sectionHeader(playerPage, "Speed")
toggleItem(playerPage, "Speed Hack", "Thay đổi tốc độ di chuyển.", false, function(s)
    CFG.SpeedEnabled = s
    local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if hum then hum.WalkSpeed = s and CFG.Speed or 16 end
end)
inputItem(playerPage, "WalkSpeed:", 32, function(v)
    if v > 0 and v <= 200 then
        CFG.Speed = v
        if CFG.SpeedEnabled then
            local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
            if hum then hum.WalkSpeed = v end
        end
    end
end)

-- ─── MISC ───
local miscPage = contentPages["Misc"]
pageTitle(miscPage, "Misc")
divider(miscPage)

sectionHeader(miscPage, "Hitbox")
inputItem(miscPage, "Hitbox Size:", 2, function(v) if v > 0 and v <= 100 then CFG.HitboxSize = v end end)

divider(miscPage)
sectionHeader(miscPage, "Reset")
actionItem(miscPage, "🔄  RESET ALL", Color3.fromRGB(160, 30, 30), function()
    CFG.EspEnabled = false; CFG.AimEnabled = false; CFG.InfJump = false
    CFG.SpeedEnabled = false; CFG.HitboxSize = 2
    hideAllEsp(); resetAllHitboxes()
    if fovFrame then fovFrame.Visible = false end
    local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if hum then hum.WalkSpeed = 16 end
    StatusLabel.Text = "Reset done!"
end)

divider(miscPage)
local creditOrder = nextOrder(miscPage)
local credit = Instance.new("TextLabel")
credit.Size = UDim2.new(1, 0, 0, 20)
credit.BackgroundTransparency = 1
credit.Text = "Hoàng Anh Hub v13"
credit.TextColor3 = Color3.fromRGB(50, 50, 50)
credit.TextSize = 9
credit.Font = Enum.Font.Gotham
credit.LayoutOrder = creditOrder
credit.Parent = miscPage

-- ═══════════════════════════════════════════════════════════════
-- DEFAULT STATE + TOGGLE
-- ═══════════════════════════════════════════════════════════════
sidebarButtons["Main"].BackgroundColor3 = CLR_ACTIVE
sidebarButtons["Main"].BackgroundTransparency = 0
sidebarButtons["Main"].TextColor3 = CLR_TEXT
contentPages["Main"].Visible = true

local menuVisible = true

ToggleBtn.MouseButton1Click:Connect(function() menuVisible = not menuVisible; Main.Visible = menuVisible end)
MinBtn.MouseButton1Click:Connect(function() menuVisible = false; Main.Visible = false end)
CloseBtn.MouseButton1Click:Connect(function() menuVisible = false; Main.Visible = false end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    if input.KeyCode == Enum.KeyCode.RightShift then
        menuVisible = not menuVisible
        Main.Visible = menuVisible
    end
end)


-- ═══════════════════════════════════════════════════════════════
-- INIT: Tạo ESP cho tất cả players hiện có
-- ═══════════════════════════════════════════════════════════════
for _, player in pairs(Players:GetPlayers()) do
    if player ~= LocalPlayer then
        createPlayerEsp(player)
    end
end

-- Tạo ESP cho player mới join
Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function()
        task.wait(0.5)
    end)
    createPlayerEsp(player)
end)

-- Xóa ESP khi player rời
Players.PlayerRemoving:Connect(removePlayerEsp)

-- ═══════════════════════════════════════════════════════════════
-- MAIN LOOP (RenderStepped = mỗi frame)
-- ═══════════════════════════════════════════════════════════════
RunService.RenderStepped:Connect(function()
    -- Cập nhật Camera reference
    Camera = workspace.CurrentCamera

    -- ─── HITBOX ───
    if CFG.HitboxSize > 2 then
        for _, player in pairs(Players:GetPlayers()) do
            if player ~= LocalPlayer and player.Character then
                local hrp = player.Character:FindFirstChild("HumanoidRootPart")
                if hrp and hrp.Size.X ~= CFG.HitboxSize then
                    applyHitbox(player.Character, CFG.HitboxSize)
                end
            end
        end
    end

    -- ─── ESP ───
    updateEsp()

    -- ─── AIMBOT ───
    if CFG.AimEnabled then
        -- Cập nhật FOV circle
        pcall(function()
            if fovFrame then
                local fovDiameter = CFG.AimFOV * 2
                fovFrame.Size = UDim2.new(0, fovDiameter, 0, fovDiameter)
                fovFrame.Visible = CFG.AimShowFOV
            end
        end)

        -- AimOnShoot: poll MouseButton1 mỗi frame
        isShooting = UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1)
        local shouldAim = (not CFG.AimOnShoot) or isShooting

        if shouldAim then
            local ok, target = pcall(getTarget)
            if ok and target then
                pcall(aimAt, target)
                pcall(function() if fovStroke then fovStroke.Color = Color3.fromRGB(255, 50, 50) end end)
            else
                pcall(function() if fovStroke then fovStroke.Color = Color3.fromRGB(255, 255, 255) end end)
            end
        else
            pcall(function() if fovStroke then fovStroke.Color = Color3.fromRGB(255, 255, 255) end end)
        end
    else
        pcall(function() if fovFrame then fovFrame.Visible = false end end)
    end
end)

-- ═══════════════════════════════════════════════════════════════
-- RAINBOW BORDER EFFECT
-- ═══════════════════════════════════════════════════════════════
task.spawn(function()
    local hue = 0
    while true do
        hue = (hue + 1) % 360
        local rainbowColor = Color3.fromHSV(hue / 360, 0.8, 1)
        mainStroke.Color = rainbowColor
        toggleStroke.Color = rainbowColor
        task.wait(0.05)
    end
end)

-- ═══════════════════════════════════════════════════════════════
-- READY!
-- ═══════════════════════════════════════════════════════════════
StatusLabel.Text = "⚡ " .. CFG.HubName .. " " .. CFG.Version .. " sẵn sàng! | RightShift để mở"
print("═══════════════════════════════════════")
print("  ⚡ Hoàng Anh Hub " .. CFG.Version .. " loaded!")
print("  📌 Nút HA hoặc RightShift: mở menu")
print("  📌 ESP: Box + Name + HP + Skeleton + Tracer")
print("  📌 AIM: Aimbot + FOV + Prediction + WallCheck")
print("  📌 PLAYER: InfJump + Speed")
print("  📌 MISC: Hitbox + Reset")
print("═══════════════════════════════════════")
