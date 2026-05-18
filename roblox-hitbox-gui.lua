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
    AimWallCheck = true,
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

    local origin = myChar.Head.Position
    local direction = (targetPart.Position - origin)

    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {myChar}

    local result = workspace:Raycast(origin, direction, params)
    if result then
        -- Nếu raycast trúng 1 phần thuộc character của target → OK
        return result.Instance:IsDescendantOf(targetPart.Parent)
    end
    return true  -- Không bị chặn
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

    -- Prediction: dự đoán vị trí dựa trên velocity
    if CFG.AimPrediction and target.character then
        local hrp = target.character:FindFirstChild("HumanoidRootPart")
        if hrp then
            local velocity = hrp.Velocity
            local dist = (hrp.Position - Camera.CFrame.Position).Magnitude
            aimPos = aimPos + velocity * CFG.AimPredAmount * (dist / 100)
        end
    end

    -- Aim bằng Camera.CFrame.Position (chính xác hơn Head.Position)
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

-- Toggle button (HA icon)
local ToggleBtn = Instance.new("TextButton")
ToggleBtn.Size = UDim2.new(0, 44, 0, 44)
ToggleBtn.Position = UDim2.new(0, 10, 0.5, -22)
ToggleBtn.BackgroundColor3 = Color3.fromRGB(0, 80, 190)
ToggleBtn.BorderSizePixel = 0
ToggleBtn.Text = "HA"
ToggleBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
ToggleBtn.TextSize = 17
ToggleBtn.Font = Enum.Font.GothamBold
ToggleBtn.Active = true
ToggleBtn.Draggable = true
ToggleBtn.Parent = ScreenGui

local toggleCorner = Instance.new("UICorner")
toggleCorner.CornerRadius = UDim.new(0, 10)
toggleCorner.Parent = ToggleBtn

local toggleStroke = Instance.new("UIStroke")
toggleStroke.Color = Color3.fromRGB(0, 200, 255)
toggleStroke.Thickness = 2
toggleStroke.Parent = ToggleBtn

-- ═══════════════════════════════════════════════════════════════
-- GUI: MAIN FRAME
-- ═══════════════════════════════════════════════════════════════
local Main = Instance.new("Frame")
Main.Size = UDim2.new(0, 380, 0, 470)
Main.Position = UDim2.new(0.5, -190, 0.12, 0)
Main.BackgroundColor3 = Color3.fromRGB(12, 12, 20)
Main.BackgroundTransparency = 0.02
Main.BorderSizePixel = 0
Main.Active = true
Main.Draggable = true
Main.Parent = ScreenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 8)
mainCorner.Parent = Main

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(0, 140, 255)
mainStroke.Thickness = 1.5
mainStroke.Transparency = 0.1
mainStroke.Parent = Main

-- ═══════════════════════════════════════════════════════════════
-- GUI: TITLE BAR
-- ═══════════════════════════════════════════════════════════════
local Title = Instance.new("Frame")
Title.Size = UDim2.new(1, 0, 0, 38)
Title.BackgroundColor3 = Color3.fromRGB(0, 50, 120)
Title.BorderSizePixel = 0
Title.Parent = Main

local titleCorner = Instance.new("UICorner")
titleCorner.CornerRadius = UDim.new(0, 8)
titleCorner.Parent = Title

-- Fill bottom corners of title
local TitleFill = Instance.new("Frame")
TitleFill.Size = UDim2.new(1, 0, 0, 8)
TitleFill.Position = UDim2.new(0, 0, 1, -8)
TitleFill.BackgroundColor3 = Color3.fromRGB(0, 70, 155)
TitleFill.BorderSizePixel = 0
TitleFill.Parent = Title

local TitleText = Instance.new("TextLabel")
TitleText.Size = UDim2.new(1, -45, 1, 0)
TitleText.Position = UDim2.new(0, 12, 0, 0)
TitleText.BackgroundTransparency = 1
TitleText.Text = "⚡ " .. CFG.HubName .. " " .. CFG.Version
TitleText.TextColor3 = Color3.fromRGB(255, 255, 255)
TitleText.TextSize = 15
TitleText.Font = Enum.Font.GothamBold
TitleText.TextXAlignment = Enum.TextXAlignment.Left
TitleText.Parent = Title

-- Close button
local CloseBtn = Instance.new("TextButton")
CloseBtn.Size = UDim2.new(0, 24, 0, 24)
CloseBtn.Position = UDim2.new(1, -28, 0, 5)
CloseBtn.BackgroundColor3 = Color3.fromRGB(190, 40, 40)
CloseBtn.BorderSizePixel = 0
CloseBtn.Text = "✕"
CloseBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
CloseBtn.TextSize = 12
CloseBtn.Font = Enum.Font.GothamBold
CloseBtn.Parent = Title

local closeCorner = Instance.new("UICorner")
closeCorner.CornerRadius = UDim.new(0, 6)
closeCorner.Parent = CloseBtn

-- Status text
local StatusLabel = Instance.new("TextLabel")
StatusLabel.Size = UDim2.new(1, -16, 0, 14)
StatusLabel.Position = UDim2.new(0, 10, 0, 40)
StatusLabel.BackgroundTransparency = 1
StatusLabel.Text = "⚡ Sẵn sàng!"
StatusLabel.TextColor3 = Color3.fromRGB(130, 130, 150)
StatusLabel.TextSize = 9
StatusLabel.Font = Enum.Font.Gotham
StatusLabel.TextXAlignment = Enum.TextXAlignment.Left
StatusLabel.Parent = Main

-- ═══════════════════════════════════════════════════════════════
-- GUI: TAB BAR
-- ═══════════════════════════════════════════════════════════════
local TabBar = Instance.new("Frame")
TabBar.Size = UDim2.new(1, -16, 0, 28)
TabBar.Position = UDim2.new(0, 8, 0, 56)
TabBar.BackgroundTransparency = 1
TabBar.Parent = Main

local TabLayout = Instance.new("UIListLayout")
TabLayout.FillDirection = Enum.FillDirection.Horizontal
TabLayout.Padding = UDim.new(0, 3)
TabLayout.SortOrder = Enum.SortOrder.LayoutOrder
TabLayout.Parent = TabBar

local tabButtons = {}
local tabPages = {}

-- Tạo 1 tab mới
local function createTab(name, emoji, order, width)
    -- Tab button
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(0, width or 70, 0, 26)
    btn.BackgroundColor3 = Color3.fromRGB(22, 22, 35)
    btn.BorderSizePixel = 0
    btn.Text = emoji .. " " .. name
    btn.TextColor3 = Color3.fromRGB(140, 140, 160)
    btn.TextSize = 11
    btn.Font = Enum.Font.GothamBold
    btn.LayoutOrder = order
    btn.Parent = TabBar

    local btnCorner = Instance.new("UICorner")
    btnCorner.CornerRadius = UDim.new(0, 6)
    btnCorner.Parent = btn

    -- Tab content page (scrolling frame)
    local page = Instance.new("ScrollingFrame")
    page.Size = UDim2.new(1, -16, 1, -92)
    page.Position = UDim2.new(0, 8, 0, 88)
    page.BackgroundTransparency = 1
    page.BorderSizePixel = 0
    page.ScrollBarThickness = 3
    page.ScrollBarImageColor3 = Color3.fromRGB(0, 140, 255)
    page.CanvasSize = UDim2.new(0, 0, 0, 0)
    page.AutomaticCanvasSize = Enum.AutomaticSize.Y
    page.Visible = false
    page.Parent = Main

    local pageLayout = Instance.new("UIListLayout")
    pageLayout.Padding = UDim.new(0, 3)
    pageLayout.SortOrder = Enum.SortOrder.LayoutOrder
    pageLayout.Parent = page

    local pagePadding = Instance.new("UIPadding")
    pagePadding.PaddingLeft = UDim.new(0, 2)
    pagePadding.PaddingRight = UDim.new(0, 2)
    pagePadding.PaddingTop = UDim.new(0, 1)
    pagePadding.Parent = page

    tabButtons[name] = btn
    tabPages[name] = page

    -- Switch tab on click
    btn.MouseButton1Click:Connect(function()
        for tabName, tabPage in pairs(tabPages) do
            tabPage.Visible = (tabName == name)
        end
        for tabName, tabBtn in pairs(tabButtons) do
            if tabName == name then
                tabBtn.BackgroundColor3 = Color3.fromRGB(0, 80, 180)
                tabBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
            else
                tabBtn.BackgroundColor3 = Color3.fromRGB(22, 22, 35)
                tabBtn.TextColor3 = Color3.fromRGB(140, 140, 160)
            end
        end
    end)

    return page
end

-- ═══════════════════════════════════════════════════════════════
-- GUI: UI BUILDER FUNCTIONS (viết đầy đủ, không rút gọn)
-- ═══════════════════════════════════════════════════════════════
local elementOrder = 0

-- Section header
local function sectionHeader(parentPage, text, icon)
    elementOrder = elementOrder + 1

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 24)
    frame.BackgroundColor3 = Color3.fromRGB(0, 60, 130)
    frame.BackgroundTransparency = 0.4
    frame.BorderSizePixel = 0
    frame.LayoutOrder = elementOrder
    frame.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = frame

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -8, 1, 0)
    label.Position = UDim2.new(0, 8, 0, 0)
    label.BackgroundTransparency = 1
    label.Text = icon .. " " .. text
    label.TextColor3 = Color3.fromRGB(0, 200, 255)
    label.TextSize = 12
    label.Font = Enum.Font.GothamBold
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = frame

    return frame
end

-- Toggle button (iOS-style indicator)
local function toggleButton(parentPage, text, defaultValue, callback)
    elementOrder = elementOrder + 1

    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 30)
    btn.BackgroundColor3 = Color3.fromRGB(24, 24, 38)
    btn.BorderSizePixel = 0
    btn.Text = ""
    btn.LayoutOrder = elementOrder
    btn.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 8)
    corner.Parent = btn

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -56, 1, 0)
    label.Position = UDim2.new(0, 12, 0, 0)
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.fromRGB(210, 210, 220)
    label.TextSize = 12
    label.Font = Enum.Font.GothamMedium
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = btn

    local indicator = Instance.new("Frame")
    indicator.Size = UDim2.new(0, 36, 0, 18)
    indicator.Position = UDim2.new(1, -48, 0.5, -9)
    indicator.BackgroundColor3 = defaultValue and Color3.fromRGB(0, 180, 80) or Color3.fromRGB(55, 55, 70)
    indicator.BorderSizePixel = 0
    indicator.Parent = btn

    local indCorner = Instance.new("UICorner")
    indCorner.CornerRadius = UDim.new(1, 0)
    indCorner.Parent = indicator

    local dot = Instance.new("Frame")
    dot.Size = UDim2.new(0, 14, 0, 14)
    dot.Position = defaultValue and UDim2.new(1, -16, 0.5, -7) or UDim2.new(0, 2, 0.5, -7)
    dot.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
    dot.BorderSizePixel = 0
    dot.Parent = indicator

    local dotCorner = Instance.new("UICorner")
    dotCorner.CornerRadius = UDim.new(1, 0)
    dotCorner.Parent = dot

    local state = defaultValue

    btn.MouseButton1Click:Connect(function()
        state = not state
        indicator.BackgroundColor3 = state and Color3.fromRGB(0, 180, 80) or Color3.fromRGB(55, 55, 70)
        dot.Position = state and UDim2.new(1, -16, 0.5, -7) or UDim2.new(0, 2, 0.5, -7)
        callback(state)
    end)

    return btn
end

-- Input field (label + textbox)
local function inputField(parentPage, label, defaultValue, callback)
    elementOrder = elementOrder + 1

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 30)
    frame.BackgroundColor3 = Color3.fromRGB(24, 24, 38)
    frame.BorderSizePixel = 0
    frame.LayoutOrder = elementOrder
    frame.Parent = parentPage

    local fCorner = Instance.new("UICorner")
    fCorner.CornerRadius = UDim.new(0, 8)
    fCorner.Parent = frame

    local labelObj = Instance.new("TextLabel")
    labelObj.Size = UDim2.new(0.5, -8, 1, 0)
    labelObj.Position = UDim2.new(0, 12, 0, 0)
    labelObj.BackgroundTransparency = 1
    labelObj.Text = label
    labelObj.TextColor3 = Color3.fromRGB(200, 200, 210)
    labelObj.TextSize = 12
    labelObj.Font = Enum.Font.GothamMedium
    labelObj.TextXAlignment = Enum.TextXAlignment.Left
    labelObj.Parent = frame

    local textBox = Instance.new("TextBox")
    textBox.Size = UDim2.new(0, 60, 0, 22)
    textBox.Position = UDim2.new(1, -72, 0.5, -11)
    textBox.BackgroundColor3 = Color3.fromRGB(16, 16, 28)
    textBox.BorderSizePixel = 0
    textBox.Text = tostring(defaultValue)
    textBox.TextColor3 = Color3.fromRGB(0, 200, 255)
    textBox.TextSize = 12
    textBox.Font = Enum.Font.GothamBold
    textBox.ClearTextOnFocus = false
    textBox.Parent = frame

    local boxCorner = Instance.new("UICorner")
    boxCorner.CornerRadius = UDim.new(0, 6)
    boxCorner.Parent = textBox

    local boxStroke = Instance.new("UIStroke")
    boxStroke.Color = Color3.fromRGB(0, 100, 200)
    boxStroke.Thickness = 1
    boxStroke.Transparency = 0.5
    boxStroke.Parent = textBox

    textBox.FocusLost:Connect(function()
        local num = tonumber(textBox.Text)
        if num then
            callback(num)
        end
    end)

    return frame
end

-- Action button
local function actionButton(parentPage, text, color, callback)
    elementOrder = elementOrder + 1

    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 30)
    btn.BackgroundColor3 = color
    btn.BorderSizePixel = 0
    btn.Text = text
    btn.TextColor3 = Color3.fromRGB(255, 255, 255)
    btn.TextSize = 11
    btn.Font = Enum.Font.GothamBold
    btn.LayoutOrder = elementOrder
    btn.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = btn

    btn.MouseButton1Click:Connect(callback)

    return btn
end

-- Color picker row (6 nút màu)
local function colorPickerRow(parentPage)
    elementOrder = elementOrder + 1

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 24)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = elementOrder
    frame.Parent = parentPage

    local colors = {
        {"R", Color3.fromRGB(255, 50, 50)},
        {"G", Color3.fromRGB(50, 255, 80)},
        {"Y", Color3.fromRGB(255, 255, 50)},
        {"P", Color3.fromRGB(180, 50, 255)},
        {"Pk", Color3.fromRGB(255, 100, 200)},
        {"W", Color3.fromRGB(255, 255, 255)},
    }

    for i, colorData in ipairs(colors) do
        local colorBtn = Instance.new("TextButton")
        colorBtn.Size = UDim2.new(0, 42, 0, 22)
        colorBtn.Position = UDim2.new(0, (i - 1) * 46, 0, 1)
        colorBtn.BackgroundColor3 = colorData[2]
        colorBtn.BorderSizePixel = 0
        colorBtn.Text = colorData[1]
        colorBtn.TextColor3 = Color3.fromRGB(0, 0, 0)
        colorBtn.TextSize = 9
        colorBtn.Font = Enum.Font.GothamBold
        colorBtn.Parent = frame

        local colorCorner = Instance.new("UICorner")
        colorCorner.CornerRadius = UDim.new(0, 5)
        colorCorner.Parent = colorBtn

        colorBtn.MouseButton1Click:Connect(function()
            CFG.EspColor = colorData[2]
        end)
    end

    return frame
end

-- Selector (multiple choice buttons)
local function selectorRow(parentPage, label, options, default, callback)
    elementOrder = elementOrder + 1

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 24)
    frame.BackgroundTransparency = 1
    frame.LayoutOrder = elementOrder
    frame.Parent = parentPage

    local labelObj = Instance.new("TextLabel")
    labelObj.Size = UDim2.new(0.3, 0, 1, 0)
    labelObj.BackgroundTransparency = 1
    labelObj.Text = " " .. label
    labelObj.TextColor3 = Color3.fromRGB(190, 190, 190)
    labelObj.TextSize = 10
    labelObj.Font = Enum.Font.GothamMedium
    labelObj.TextXAlignment = Enum.TextXAlignment.Left
    labelObj.Parent = frame

    local optionButtons = {}

    for i, option in ipairs(options) do
        local optionBtn = Instance.new("TextButton")
        optionBtn.Size = UDim2.new(0.22, 0, 1, 0)
        optionBtn.Position = UDim2.new(0.3 + (i - 1) * 0.24, 0, 0, 0)
        optionBtn.BackgroundColor3 = (option == default) and Color3.fromRGB(0, 90, 190) or Color3.fromRGB(32, 32, 46)
        optionBtn.BorderSizePixel = 0
        optionBtn.Text = option
        optionBtn.TextColor3 = (option == default) and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(140, 140, 160)
        optionBtn.TextSize = 10
        optionBtn.Font = Enum.Font.GothamBold
        optionBtn.Parent = frame

        local optionCorner = Instance.new("UICorner")
        optionCorner.CornerRadius = UDim.new(0, 5)
        optionCorner.Parent = optionBtn

        optionButtons[option] = optionBtn

        optionBtn.MouseButton1Click:Connect(function()
            for name, btn in pairs(optionButtons) do
                if name == option then
                    btn.BackgroundColor3 = Color3.fromRGB(0, 90, 190)
                    btn.TextColor3 = Color3.fromRGB(255, 255, 255)
                else
                    btn.BackgroundColor3 = Color3.fromRGB(32, 32, 46)
                    btn.TextColor3 = Color3.fromRGB(140, 140, 160)
                end
            end
            callback(option)
        end)
    end

    return frame
end

-- ═══════════════════════════════════════════════════════════════
-- GUI: BUILD TABS
-- ═══════════════════════════════════════════════════════════════

-- ─── ESP TAB ───
local espPage = createTab("ESP", "👁️", 1, 55)

sectionHeader(espPage, "HIỂN THỊ", "👤")

toggleButton(espPage, "Bật ESP", false, function(state)
    CFG.EspEnabled = state
    if not state then hideAllEsp() end
end)

toggleButton(espPage, "Box 2D (4 Line)", true, function(state)
    CFG.EspBox = state
end)

toggleButton(espPage, "Tên Player", true, function(state)
    CFG.EspName = state
end)

toggleButton(espPage, "Thanh Máu (HP Bar)", true, function(state)
    CFG.EspHP = state
end)

toggleButton(espPage, "Số Máu (HP Text: 75/100)", true, function(state)
    CFG.EspHPText = state
end)

toggleButton(espPage, "💀 Skeleton (Khung Xương)", false, function(state)
    CFG.EspSkeleton = state
end)

toggleButton(espPage, "Khoảng Cách (Meters)", true, function(state)
    CFG.EspMeters = state
end)

toggleButton(espPage, "Tracer (Dây)", false, function(state)
    CFG.EspTracer = state
end)

sectionHeader(espPage, "MÀU SẮC", "🎨")
colorPickerRow(espPage)

-- Skeleton color picker
elementOrder = elementOrder + 1
local skelColorFrame = Instance.new("Frame")
skelColorFrame.Size = UDim2.new(1, 0, 0, 24)
skelColorFrame.BackgroundTransparency = 1
skelColorFrame.LayoutOrder = elementOrder
skelColorFrame.Parent = espPage

local skelColors = {
    {"Y", Color3.fromRGB(255, 255, 50)},
    {"W", Color3.fromRGB(255, 255, 255)},
    {"C", Color3.fromRGB(0, 255, 255)},
    {"O", Color3.fromRGB(255, 150, 0)},
    {"P", Color3.fromRGB(180, 50, 255)},
    {"R", Color3.fromRGB(255, 50, 50)},
}
for i, c in ipairs(skelColors) do
    local cb = Instance.new("TextButton")
    cb.Size = UDim2.new(0, 40, 0, 22)
    cb.Position = UDim2.new(0, (i - 1) * 46, 0, 1)
    cb.BackgroundColor3 = c[2]
    cb.BorderSizePixel = 0
    cb.Text = c[1]
    cb.TextColor3 = Color3.fromRGB(0, 0, 0)
    cb.TextSize = 9
    cb.Font = Enum.Font.GothamBold
    cb.Parent = skelColorFrame
    local cc = Instance.new("UICorner")
    cc.CornerRadius = UDim.new(0, 5)
    cc.Parent = cb
    cb.MouseButton1Click:Connect(function()
        CFG.EspSkeletonColor = c[2]
    end)
end

sectionHeader(espPage, "ESP MÀU SKELETON ☝️", "💀")

-- ─── AIM TAB ───
local aimPage = createTab("AIM", "🎯", 2, 50)

sectionHeader(aimPage, "AIMBOT", "🎯")

toggleButton(aimPage, "Bật Aimbot", false, function(state)
    CFG.AimEnabled = state
end)

toggleButton(aimPage, "Check Tường (Wall Check)", true, function(state)
    CFG.AimWallCheck = state
end)

toggleButton(aimPage, "Chỉ Aim khi Bắn", false, function(state)
    CFG.AimOnShoot = state
end)

toggleButton(aimPage, "Hiện FOV Circle", true, function(state)
    CFG.AimShowFOV = state
end)

toggleButton(aimPage, "Prediction (Dự đoán)", true, function(state)
    CFG.AimPrediction = state
end)

sectionHeader(aimPage, "BỘ PHẬN AIM", "🦴")
selectorRow(aimPage, "Aim:", {"Đầu", "Cổ", "Thân"}, "Đầu", function(opt)
    if opt == "Đầu" then
        CFG.AimPart = "Head"
    elseif opt == "Cổ" then
        CFG.AimPart = "Torso"
    else
        CFG.AimPart = "HumanoidRootPart"
    end
end)

sectionHeader(aimPage, "CÀI ĐẶT", "⚙️")
inputField(aimPage, "FOV:", 200, function(val)
    if val > 0 then CFG.AimFOV = val end
end)
inputField(aimPage, "Smooth:", 2, function(val)
    if val >= 1 then CFG.AimSmooth = val end
end)
inputField(aimPage, "Prediction:", 12, function(val)
    if val > 0 then CFG.AimPredAmount = val / 100 end
end)

-- ─── PLAYER TAB ───
local playerPage = createTab("PLAYER", "🏃", 3, 58)

sectionHeader(playerPage, "MOVEMENT", "🏃")

toggleButton(playerPage, "Infinity Jump", false, function(state)
    CFG.InfJump = state
end)

sectionHeader(playerPage, "SPEED", "⚡")
toggleButton(playerPage, "Bật Speed", false, function(state)
    CFG.SpeedEnabled = state
    local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if hum then
        hum.WalkSpeed = state and CFG.Speed or 16
    end
end)
inputField(playerPage, "Tốc độ:", 32, function(val)
    if val > 0 and val <= 200 then
        CFG.Speed = val
        if CFG.SpeedEnabled then
            local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
            if hum then
                hum.WalkSpeed = val
            end
        end
    end
end)

-- ─── MISC TAB ───
local miscPage = createTab("MISC", "⚙️", 4, 45)

sectionHeader(miscPage, "HITBOX", "📐")
inputField(miscPage, "Size:", 2, function(val)
    if val > 0 and val <= 100 then
        CFG.HitboxSize = val
    end
end)

sectionHeader(miscPage, "RESET", "🔄")
actionButton(miscPage, "🔄 RESET ALL", Color3.fromRGB(170, 35, 35), function()
    -- Reset config
    CFG.EspEnabled = false
    CFG.AimEnabled = false
    CFG.InfJump = false
    CFG.SpeedEnabled = false
    CFG.HitboxSize = 2

    -- Hide all ESP
    hideAllEsp()

    -- Reset hitboxes
    resetAllHitboxes()

    -- Reset speed
    local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if hum then
        hum.WalkSpeed = 16
    end

    -- Ẩn FOV circle
    fovFrame.Visible = false
    StatusLabel.Text = "🔄 Đã reset tất cả!"
end)

-- Credit
elementOrder = elementOrder + 1
local creditLabel = Instance.new("TextLabel")
creditLabel.Size = UDim2.new(1, 0, 0, 16)
creditLabel.BackgroundTransparency = 1
creditLabel.Text = "by " .. CFG.HubName .. " " .. CFG.Version
creditLabel.TextColor3 = Color3.fromRGB(45, 45, 60)
creditLabel.TextSize = 8
creditLabel.Font = Enum.Font.Gotham
creditLabel.LayoutOrder = elementOrder
creditLabel.Parent = miscPage

-- ═══════════════════════════════════════════════════════════════
-- GUI: SET DEFAULT TAB
-- ═══════════════════════════════════════════════════════════════
tabButtons["ESP"].BackgroundColor3 = Color3.fromRGB(0, 90, 190)
tabButtons["ESP"].TextColor3 = Color3.fromRGB(255, 255, 255)
tabPages["ESP"].Visible = true

-- ═══════════════════════════════════════════════════════════════
-- GUI: MENU TOGGLE
-- ═══════════════════════════════════════════════════════════════
ToggleBtn.MouseButton1Click:Connect(function()
    menuVisible = not menuVisible
    Main.Visible = menuVisible
end)

CloseBtn.MouseButton1Click:Connect(function()
    menuVisible = false
    Main.Visible = false
end)

-- Toggle bằng RightShift
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
        local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)

        -- Cập nhật FOV circle (Frame-based)
        local fovDiameter = CFG.AimFOV * 2
        fovFrame.Size = UDim2.new(0, fovDiameter, 0, fovDiameter)
        fovFrame.Visible = CFG.AimShowFOV

        -- AimOnShoot: check MouseButton1 mỗi frame (poll, không event)
        isShooting = UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1)

        local shouldAim = (not CFG.AimOnShoot) or isShooting

        if shouldAim then
            local target = getTarget()
            if target then
                aimAt(target)
                fovStroke.Color = Color3.fromRGB(255, 50, 50) -- Đỏ khi lock
            else
                fovStroke.Color = Color3.fromRGB(255, 255, 255) -- Trắng khi idle
            end
        else
            fovStroke.Color = Color3.fromRGB(255, 255, 255)
        end
    else
        fovFrame.Visible = false
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
