-- Hoàng Anh Hub v21.3
-- Features: ESP (Corner Box/Name/Distance/HP/Head Dot/Tracer/Skeleton),
-- Aimbot (Gần nhất/Máu thấp nhất), Silent Aim, TriggerBot, Chams,
-- Wallbang (Xuyên vật thể), Hitbox, Player Mods,
-- Speed, Jump, Noclip, Infinite Jump, Anti-AFK, Keybind System
-- Liquid Glass UI, Bottom Tab Bar, Modern Glassmorphism Style
-- ⚠️ Sử dụng có thể bị phạt trong game. Dùng có trách nhiệm.

-- ============================================================
-- CLEANUP OLD INSTANCE
-- ============================================================
if _G.HOANG_ANH_HUB then
    pcall(function()
        if _G.HOANG_ANH_HUB.Cleanup then _G.HOANG_ANH_HUB.Cleanup() end
    end)
end

-- ============================================================
-- SERVICES
-- ============================================================
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local Camera = workspace.CurrentCamera
local LocalPlayer = Players.LocalPlayer

-- ============================================================
-- CONFIG
-- ============================================================
local Config = {
    -- ESP
    ESPEnabled = false,
    ESPBox = true,
    ESPBoxType = "corners",
    ESPCornerSize = 10,
    ESPName = true,
    ESPHealth = true,
    ESPHealthBarSide = "right",
    ESPDistance = true,
    ESPHeadDot = true,
    ESPTracer = true,
    ESPTeamCheck = false,
    ESPColor = Color3.fromRGB(0, 255, 100),
    ESPTeamColor = Color3.fromRGB(100, 180, 255),
    ESPMaxDistance = 1000,
    ESPFadeByDistance = true,
    ESPWeapon = true,

    -- Skeleton
    SkeletonEnabled = false,
    SkeletonColor = Color3.fromRGB(180, 220, 255),
    SkeletonThickness = 1.5,

    -- Aimbot
    AimbotEnabled = false,
    AimbotOnFire = false,
    AimbotTeamCheck = false,
    AimbotTarget = "Head",
    AimbotFOV = 200,
    AimbotShowFOV = false,
    AimbotSmooth = 1,
    AimbotWallbang = false,
    AimbotPriority = "closest",
    AimbotStickyTarget = true,
    AimbotStickyThreshold = 1.3,
    AimbotDynamicFOV = false,
    AimbotDynamicFOVMin = 100,
    AimbotDynamicFOVMax = 400,
    AimbotDynamicFOVDist = 150,

    -- Wallbang
    WallbangEnabled = false,

    -- Hitbox
    HitboxEnabled = false,
    HitboxSize = 10,
    HeadHitboxEnabled = false,
    HeadHitboxSize = 10,

    -- Player
    SpeedEnabled = false,
    SpeedValue = 16,
    JumpEnabled = false,
    JumpValue = 50,
    NoclipEnabled = false,

    -- Silent Aim
    SilentAimEnabled = false,
    SilentAimTarget = "Head",
    SilentAimFOV = 200,
    SilentAimShowFOV = false,
    SilentAimTeamCheck = false,
    SilentAimPrediction = true,

    -- TriggerBot
    TriggerBotEnabled = false,
    TriggerBotTeamCheck = false,
    TriggerBotDelay = 0,
    TriggerBotTarget = "Head",

    -- Chams
    ChamsEnabled = false,
    ChamsFillColor = Color3.fromRGB(255, 0, 100),
    ChamsOutlineColor = Color3.fromRGB(255, 255, 255),
    ChamsFillTransparency = 0.5,
    ChamsOutlineTransparency = 0,
    ChamsTeamCheck = false,

    -- Infinite Jump
    InfiniteJumpEnabled = false,

    -- Anti-AFK
    AntiAFKEnabled = false,

    -- Keybinds
    Keybinds = {
        ToggleMenu = Enum.KeyCode.Insert,
        ToggleESP = Enum.KeyCode.F1,
        ToggleAimbot = Enum.KeyCode.F2,
        ToggleSilentAim = Enum.KeyCode.F3,
        ToggleTriggerBot = Enum.KeyCode.F4,
        ToggleWallbang = Enum.KeyCode.F5,
        ToggleChams = Enum.KeyCode.F6,
        ToggleNoclip = Enum.KeyCode.F7,
        ToggleInfiniteJump = Enum.KeyCode.F8,
    },
}

-- ============================================================
-- STATE
-- ============================================================
local Connections = {}
local ESPObjects = {}
local SkeletonObjects = {}
local WallbangHook = nil
local NoclipConnection = nil
local FOVCircle = nil
local SilentAimFOVCircle = nil
local ChamsObjects = {}
local AntiAFKConnection = nil
local LastTriggerTime = 0
local CurrentAimbotTarget = nil
local UIToggles = {}

-- ============================================================
-- UTILITY
-- ============================================================
local function safeDisconnect(conn)
    pcall(function()
        if conn and typeof(conn) == "RBXScriptConnection" then conn:Disconnect() end
    end)
end

local function getCharacter(player)
    return player.Character
end

local function getHumanoid(player)
    local char = getCharacter(player)
    return char and char:FindFirstChildOfClass("Humanoid")
end

local function getRootPart(player)
    local char = getCharacter(player)
    return char and (char:FindFirstChild("HumanoidRootPart") or char:FindFirstChild("Torso"))
end

local function isAlive(player)
    local hum = getHumanoid(player)
    local root = getRootPart(player)
    return hum and root and hum.Health > 0
end

local function getScreenPos(worldPos)
    local pos, onScreen = Camera:WorldToViewportPoint(worldPos)
    return Vector2.new(pos.X, pos.Y), onScreen, pos.Z
end

local function isPlayerFromPart(part)
    if not part then return nil end
    local player = Players:GetPlayerFromCharacter(part.Parent)
    if player then return player end
    return Players:GetPlayerFromCharacter(part.Parent and part.Parent.Parent)
end

-- ============================================================
-- WALLBANG SYSTEM
-- ============================================================
local function enableWallbang()
    if WallbangHook then return end

    local oldNamecall = nil
    local hooked = false

    pcall(function()
        oldNamecall = hookmetamethod(game, "__namecall", newcclosure(function(self, ...)
            local method = getnamecallmethod()
            local args = {...}

            if Config.WallbangEnabled and oldNamecall then
                -- Hook workspace:Raycast (new API)
                if method == "Raycast" and self == workspace and #args >= 2 then
                    local origin = args[1]
                    local direction = args[2]

                    -- First cast: find what's in the way (excluding local player)
                    local testParams = RaycastParams.new()
                    testParams.FilterType = Enum.RaycastFilterType.Exclude
                    local ignoreList = {}
                    if LocalPlayer.Character then table.insert(ignoreList, LocalPlayer.Character) end
                    testParams.FilterDescendantsInstances = ignoreList

                    local result = oldNamecall(self, origin, direction, testParams)
                    if result then
                        local hitPart = result.Instance
                        local hitPlayer = isPlayerFromPart(hitPart)
                        if not hitPlayer then
                            -- Hit a wall/object, not a player. Cast from behind wall.
                            local behindWall = result.Position + direction.Unit * 1
                            local remaining = (origin + direction) - behindWall

                            -- Build new params that ignore the wall and all its siblings
                            local wallIgnore = {}
                            for _, v in ipairs(ignoreList) do table.insert(wallIgnore, v) end
                            local wallModel = hitPart.Parent
                            if wallModel then
                                for _, child in ipairs(wallModel:GetDescendants()) do
                                    if child:IsA("BasePart") then
                                        table.insert(wallIgnore, child)
                                    end
                                end
                            end
                            table.insert(wallIgnore, hitPart)

                            local newParams = args[3]
                            if newParams and typeof(newParams) == "RaycastParams" then
                                local existing = newParams.FilterDescendantsInstances or {}
                                for _, v in ipairs(existing) do table.insert(wallIgnore, v) end
                            end
                            local castParams = RaycastParams.new()
                            castParams.FilterType = Enum.RaycastFilterType.Exclude
                            castParams.FilterDescendantsInstances = wallIgnore

                            return oldNamecall(self, behindWall, remaining, castParams)
                        end
                    end
                end

                -- Hook FindPartOnRayWithIgnoreList (old API, used by many games)
                if method == "FindPartOnRayWithIgnoreList" and self == workspace and #args >= 1 then
                    local ray = args[1]
                    if typeof(ray) == "Ray" then
                        local origin = ray.Origin
                        local direction = ray.Direction

                        local testParams = RaycastParams.new()
                        testParams.FilterType = Enum.RaycastFilterType.Exclude
                        local ignoreList = {}
                        if LocalPlayer.Character then table.insert(ignoreList, LocalPlayer.Character) end
                        testParams.FilterDescendantsInstances = ignoreList

                        local detectResult = nil
                        pcall(function()
                            local dp = RaycastParams.new()
                            dp.FilterType = Enum.RaycastFilterType.Exclude
                            dp.FilterDescendantsInstances = ignoreList
                            detectResult = workspace:Raycast(origin, direction, dp)
                        end)

                        if detectResult then
                            local hitPart = detectResult.Instance
                            local hitPlayer = isPlayerFromPart(hitPart)
                            if not hitPlayer then
                                -- Skip the wall: add it to ignore list
                                local oldIgnore = args[2] or {}
                                local newIgnore = {}
                                for _, v in ipairs(oldIgnore) do table.insert(newIgnore, v) end
                                table.insert(newIgnore, hitPart)
                                if hitPart.Parent then
                                    for _, child in ipairs(hitPart.Parent:GetDescendants()) do
                                        if child:IsA("BasePart") then
                                            table.insert(newIgnore, child)
                                        end
                                    end
                                end
                                -- Cast from behind the wall
                                local behindWall = detectResult.Position + direction.Unit * 1
                                local newRay = Ray.new(behindWall, (origin + direction) - behindWall)
                                return oldNamecall(self, newRay, newIgnore, args[3])
                            end
                        end
                    end
                end
            end

            return oldNamecall(self, ...)
        end))
        hooked = true
    end)

    WallbangHook = hooked
end

local function disableWallbang()
    WallbangHook = nil
end

-- ============================================================
-- SILENT AIM SYSTEM
-- ============================================================
local SilentAimHook = nil

local function getSilentAimTarget()
    local bestTarget = nil
    local bestValue = math.huge
    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)

    for _, player in ipairs(Players:GetPlayers()) do
        if player == LocalPlayer then
            -- skip
        elseif not isAlive(player) then
            -- skip
        elseif Config.SilentAimTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
            -- skip
        else
            local char = getCharacter(player)
            local targetPart = nil

            if Config.SilentAimTarget == "Head" then
                targetPart = char and char:FindFirstChild("Head")
            elseif Config.SilentAimTarget == "HumanoidRootPart" then
                targetPart = char and char:FindFirstChild("HumanoidRootPart")
            elseif Config.SilentAimTarget == "UpperTorso" then
                targetPart = char and (char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso"))
            end

            if targetPart then
                local screenPos, onScreen = getScreenPos(targetPart.Position)
                local fovDist = (screenPos - screenCenter).Magnitude

                if fovDist <= Config.SilentAimFOV then
                    local value = 0
                    local localRoot = getRootPart(LocalPlayer)
                    if localRoot then
                        value = (targetPart.Position - localRoot.Position).Magnitude
                    end

                    if value < bestValue then
                        bestValue = value
                        bestTarget = targetPart
                    end
                end
            end
        end
    end

    return bestTarget
end

local function getPredictedPosition(targetPart)
    if not Config.SilentAimPrediction then
        return targetPart.Position
    end

    local velocity = Vector3.new(0, 0, 0)
    pcall(function()
        local root = targetPart.Parent and targetPart.Parent:FindFirstChild("HumanoidRootPart")
        if root then
            velocity = root.AssemblyLinearVelocity or root.Velocity or Vector3.zero
        end
    end)

    local dist = (targetPart.Position - Camera.CFrame.Position).Magnitude
    local travelTime = dist / 500
    return targetPart.Position + velocity * travelTime * 0.3
end

local function enableSilentAim()
    if SilentAimHook then return end

    pcall(function()
        local oldNamecall = nil
        oldNamecall = hookmetamethod(game, "__namecall", newcclosure(function(self, ...)
            local method = getnamecallmethod()
            local args = {...}

            if Config.SilentAimEnabled and method == "FireServer" then
                local target = getSilentAimTarget()
                if target then
                    local predictedPos = getPredictedPosition(target)
                    -- Modify bullet/aim arguments to point at target
                    for i, arg in ipairs(args) do
                        if typeof(arg) == "Vector3" then
                            local dist = (arg - Camera.CFrame.Position).Magnitude
                            if dist > 10 then
                                args[i] = predictedPos
                                break
                            end
                        end
                    end
                    return oldNamecall(self, unpack(args))
                end
            end

            return oldNamecall(self, ...)
        end))
        SilentAimHook = true
    end)
end

local function disableSilentAim()
    SilentAimHook = nil
end

-- ============================================================
-- TRIGGERBOT SYSTEM
-- ============================================================
local function doTriggerBot()
    if not Config.TriggerBotEnabled then return end

    local now = tick()
    if now - LastTriggerTime < Config.TriggerBotDelay then return end

    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
    local rayParams = RaycastParams.new()
    rayParams.FilterType = Enum.RaycastFilterType.Exclude
    local filterList = {}
    if LocalPlayer.Character then table.insert(filterList, LocalPlayer.Character) end
    rayParams.FilterDescendantsInstances = filterList

    local result = workspace:Raycast(Camera.CFrame.Position, Camera.CFrame.LookVector * 1000, rayParams)
    if result then
        local hitPart = result.Instance
        local hitPlayer = isPlayerFromPart(hitPart)
        if hitPlayer and hitPlayer ~= LocalPlayer then
            -- Team check
            if Config.TriggerBotTeamCheck and LocalPlayer.Team and hitPlayer.Team and LocalPlayer.Team == hitPlayer.Team then
                return
            end

            -- Verify alive
            if not isAlive(hitPlayer) then return end

            LastTriggerTime = now

            -- Try to activate tool
            pcall(function()
                local char = LocalPlayer.Character
                if char then
                    local tool = char:FindFirstChildOfClass("Tool")
                    if tool and tool:FindFirstChild("Handle") then
                        tool:Activate()
                    end
                end
            end)

            -- Simulate mouse click via VirtualInputManager if available
            pcall(function()
                local vim = game:GetService("VirtualInputManager")
                if vim then
                    local cx = Camera.ViewportSize.X / 2
                    local cy = Camera.ViewportSize.Y / 2
                    vim:SendMouseButtonEvent(cx, cy, 0, true, game, 1)
                    task.wait()
                    vim:SendMouseButtonEvent(cx, cy, 0, false, game, 1)
                end
            end)
        end
    end
end

-- ============================================================
-- CHAMS SYSTEM
-- ============================================================
local function createChams(player)
    if player == LocalPlayer then return end
    if ChamsObjects[player] then return end

    local char = getCharacter(player)
    if not char then return end

    local highlight = Instance.new("Highlight")
    highlight.Name = "HoangAnhChams"
    highlight.FillColor = Config.ChamsFillColor
    highlight.OutlineColor = Config.ChamsOutlineColor
    highlight.FillTransparency = Config.ChamsFillTransparency
    highlight.OutlineTransparency = Config.ChamsOutlineTransparency
    highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    highlight.Parent = char

    ChamsObjects[player] = highlight
end

local function removeChams(player)
    local highlight = ChamsObjects[player]
    if highlight then
        pcall(function() highlight:Destroy() end)
        ChamsObjects[player] = nil
    end
end

local function updateChams(player)
    if not Config.ChamsEnabled then
        removeChams(player)
        return
    end

    -- Team check
    if Config.ChamsTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
        removeChams(player)
        return
    end

    local char = getCharacter(player)
    local hum = getHumanoid(player)
    if not char or not hum or hum.Health <= 0 then
        removeChams(player)
        return
    end

    local highlight = ChamsObjects[player]
    if not highlight then
        createChams(player)
        highlight = ChamsObjects[player]
    end

    if highlight then
        highlight.FillColor = Config.ChamsFillColor
        highlight.OutlineColor = Config.ChamsOutlineColor
        highlight.FillTransparency = Config.ChamsFillTransparency
        highlight.OutlineTransparency = Config.ChamsOutlineTransparency
        highlight.Parent = char
    end
end

-- ============================================================
-- ESP SYSTEM
-- ============================================================
local function createESP(player)
    if player == LocalPlayer then return end
    if ESPObjects[player] then return end

    local espData = {}

    -- Corner Box: 8 short lines for 4 corners (each corner = 2 perpendicular lines)
    local cornerLines = {}
    for i = 1, 8 do
        local line = Drawing and Drawing.new("Line")
        if line then
            line.Visible = false
            line.Color = Config.ESPColor
            line.Thickness = 1.5
        end
        table.insert(cornerLines, line)
    end
    espData.CornerLines = cornerLines

    -- Full Box lines (fallback, 4 lines)
    local boxLines = {}
    for i = 1, 4 do
        local line = Drawing and Drawing.new("Line")
        if line then
            line.Visible = false
            line.Color = Config.ESPColor
            line.Thickness = 1.2
        end
        table.insert(boxLines, line)
    end
    espData.BoxLines = boxLines

    -- Name text (with outline + shadow via double rendering)
    local nameText = Drawing and Drawing.new("Text")
    if nameText then
        nameText.Visible = false
        nameText.Color = Color3.fromRGB(255, 255, 255)
        nameText.Size = 14
        nameText.Center = true
        nameText.Outline = true
        nameText.OutlineColor = Color3.fromRGB(0, 0, 0)
        nameText.Font = 2 -- SourceSans
    end
    espData.Name = nameText

    -- Distance text (below name)
    local distText = Drawing and Drawing.new("Text")
    if distText then
        distText.Visible = false
        distText.Color = Color3.fromRGB(200, 215, 235)
        distText.Size = 12
        distText.Center = true
        distText.Outline = true
        distText.OutlineColor = Color3.fromRGB(0, 0, 0)
        distText.Font = 2
    end
    espData.Distance = distText

    -- Weapon text (below box)
    local weaponText = Drawing and Drawing.new("Text")
    if weaponText then
        weaponText.Visible = false
        weaponText.Color = Color3.fromRGB(200, 215, 235)
        weaponText.Size = 11
        weaponText.Center = true
        weaponText.Outline = true
        weaponText.OutlineColor = Color3.fromRGB(0, 0, 0)
        weaponText.Font = 2
    end
    espData.Weapon = weaponText

    -- Head Dot (filled circle)
    local headDot = Drawing and Drawing.new("Circle")
    if headDot then
        headDot.Visible = false
        headDot.Color = Config.ESPColor
        headDot.Radius = 5
        headDot.Thickness = 1
        headDot.Filled = true
        headDot.NumSides = 16
    end
    espData.HeadDot = headDot

    -- Health bar background (right side of box)
    local hpBarBg = Drawing and Drawing.new("Line")
    if hpBarBg then
        hpBarBg.Visible = false
        hpBarBg.Color = Color3.fromRGB(20, 20, 30)
        hpBarBg.Thickness = 3.5
    end
    espData.HPBarBg = hpBarBg

    -- Health bar fill (gradient from green to red)
    local hpBarFill = Drawing and Drawing.new("Line")
    if hpBarFill then
        hpBarFill.Visible = false
        hpBarFill.Color = Color3.fromRGB(0, 255, 0)
        hpBarFill.Thickness = 2
    end
    espData.HPBarFill = hpBarFill

    -- Health bar outline (subtle white border around health bar)
    local hpBarOutline = Drawing and Drawing.new("Line")
    if hpBarOutline then
        hpBarOutline.Visible = false
        hpBarOutline.Color = Color3.fromRGB(255, 255, 255)
        hpBarOutline.Thickness = 4
        hpBarOutline.Transparency = 0.85
    end
    espData.HPBarOutline = hpBarOutline

    -- Health text (number inside/next to bar)
    local hpText = Drawing and Drawing.new("Text")
    if hpText then
        hpText.Visible = false
        hpText.Color = Color3.fromRGB(255, 255, 255)
        hpText.Size = 11
        hpText.Center = true
        hpText.Outline = true
        hpText.OutlineColor = Color3.fromRGB(0, 0, 0)
        hpText.Font = 2
    end
    espData.HPText = hpText

    -- Tracer (snapline from center-bottom)
    local tracer = Drawing and Drawing.new("Line")
    if tracer then
        tracer.Visible = false
        tracer.Color = Config.ESPColor
        tracer.Thickness = 1
        tracer.Transparency = 0.65
    end
    espData.Tracer = tracer

    ESPObjects[player] = espData
end

local function removeESP(player)
    local espData = ESPObjects[player]
    if not espData then return end
    pcall(function()
        if espData.CornerLines then
            for _, line in ipairs(espData.CornerLines) do
                if line then line:Remove() end
            end
        end
        if espData.BoxLines then
            for _, line in ipairs(espData.BoxLines) do
                if line then line:Remove() end
            end
        end
        if espData.Name then espData.Name:Remove() end
        if espData.Distance then espData.Distance:Remove() end
        if espData.Weapon then espData.Weapon:Remove() end
        if espData.HeadDot then espData.HeadDot:Remove() end
        if espData.HPBarBg then espData.HPBarBg:Remove() end
        if espData.HPBarFill then espData.HPBarFill:Remove() end
        if espData.HPBarOutline then espData.HPBarOutline:Remove() end
        if espData.HPText then espData.HPText:Remove() end
        if espData.Tracer then espData.Tracer:Remove() end
    end)
    ESPObjects[player] = nil
end

local function hideESP(espData)
    if espData.CornerLines then
        for _, line in ipairs(espData.CornerLines) do
            if line then line.Visible = false end
        end
    end
    if espData.BoxLines then
        for _, line in ipairs(espData.BoxLines) do
            if line then line.Visible = false end
        end
    end
    if espData.Name then espData.Name.Visible = false end
    if espData.Distance then espData.Distance.Visible = false end
    if espData.Weapon then espData.Weapon.Visible = false end
    if espData.HeadDot then espData.HeadDot.Visible = false end
    if espData.HPBarBg then espData.HPBarBg.Visible = false end
    if espData.HPBarFill then espData.HPBarFill.Visible = false end
    if espData.HPBarOutline then espData.HPBarOutline.Visible = false end
    if espData.HPText then espData.HPText.Visible = false end
    if espData.Tracer then espData.Tracer.Visible = false end
end

local function updateESP(player)
    local espData = ESPObjects[player]
    if not espData then return end

    if not Config.ESPEnabled then hideESP(espData) return end

    local char = getCharacter(player)
    local hum = getHumanoid(player)
    local root = getRootPart(player)
    if not char or not hum or not root or hum.Health <= 0 then hideESP(espData) return end

    -- Team check: show teammates in a different color (blue) instead of hiding
    local isTeammate = false
    if Config.ESPTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
        isTeammate = true
    end

    -- Distance check
    local rootPos = root.Position
    local localRoot = getRootPart(LocalPlayer)
    local worldDist = 0
    if localRoot then
        worldDist = (rootPos - localRoot.Position).Magnitude
        if worldDist > Config.ESPMaxDistance then hideESP(espData) return end
    end

    -- Get bounding box
    local head = char:FindFirstChild("Head")
    if not head then hideESP(espData) return end

    local topPos, topOnScreen = getScreenPos(head.Position + Vector3.new(0, 1.8, 0))
    local bottomPos, bottomOnScreen = getScreenPos(rootPos - Vector3.new(0, 3, 0))

    if not topOnScreen and not bottomOnScreen then hideESP(espData) return end

    local boxHeight = math.abs(bottomPos.Y - topPos.Y)
    local boxWidth = boxHeight * 0.55
    local centerX = (topPos.X + bottomPos.X) / 2

    -- Distance-based fade factor (0 = far/transparent, 1 = close/opaque)
    local fadeFactor = 1
    if Config.ESPFadeByDistance then
        local fadeStart = Config.ESPMaxDistance * 0.4
        local fadeEnd = Config.ESPMaxDistance
        fadeFactor = 1 - math.clamp((worldDist - fadeStart) / (fadeEnd - fadeStart), 0, 1)
    end
    local nameTextColor = Color3.fromRGB(
        255,
        math.floor(200 + 55 * fadeFactor),
        math.floor(200 + 55 * fadeFactor)
    )
    local tracerAlpha = 0.25 + 0.5 * fadeFactor

    local boxColor = isTeammate and Config.ESPTeamColor or Config.ESPColor

    -- ============================================================
    -- CORNER BOX (8 short lines)
    -- ============================================================
    local showCorners = Config.ESPBox and Config.ESPBoxType == "corners"
    local showFullBox = Config.ESPBox and Config.ESPBoxType == "full"

    if espData.CornerLines then
        if showCorners then
            local cs = Config.ESPCornerSize
            local x1 = centerX - boxWidth / 2
            local x2 = centerX + boxWidth / 2
            local y1 = topPos.Y
            local y2 = bottomPos.Y
            local gap = boxHeight * 0.15
            local gapTop = math.clamp(gap, cs + 4, boxHeight * 0.35)
            local gapBot = math.clamp(gap, cs + 4, boxHeight * 0.35)

            local corners = {
                -- Top-left corner: ┌
                {Vector2.new(x1, y1 + gapTop), Vector2.new(x1, y1)},
                {Vector2.new(x1, y1), Vector2.new(x1 + cs, y1)},
                -- Top-right corner: ┐
                {Vector2.new(x2, y1 + gapTop), Vector2.new(x2, y1)},
                {Vector2.new(x2, y1), Vector2.new(x2 - cs, y1)},
                -- Bottom-right corner: ┘
                {Vector2.new(x2, y2 - gapBot), Vector2.new(x2, y2)},
                {Vector2.new(x2, y2), Vector2.new(x2 - cs, y2)},
                -- Bottom-left corner: └ 
                {Vector2.new(x1, y2 - gapBot), Vector2.new(x1, y2)},
                {Vector2.new(x1, y2), Vector2.new(x1 + cs, y2)},
            }
            for i, line in ipairs(espData.CornerLines) do
                if line and corners[i] then
                    line.From = corners[i][1]
                    line.To = corners[i][2]
                    line.Color = boxColor
                    line.Visible = true
                end
            end
        else
            for _, line in ipairs(espData.CornerLines) do
                if line then line.Visible = false end
            end
        end
    end

    -- Full box fallback
    if espData.BoxLines then
        if showFullBox then
            local x1 = centerX - boxWidth / 2
            local x2 = centerX + boxWidth / 2
            local y1 = topPos.Y
            local y2 = bottomPos.Y
            local boxCorners = {
                {Vector2.new(x1, y1), Vector2.new(x2, y1)},
                {Vector2.new(x2, y1), Vector2.new(x2, y2)},
                {Vector2.new(x2, y2), Vector2.new(x1, y2)},
                {Vector2.new(x1, y2), Vector2.new(x1, y1)},
            }
            for i, line in ipairs(espData.BoxLines) do
                if line then
                    line.From = boxCorners[i][1]
                    line.To = boxCorners[i][2]
                    line.Color = boxColor
                    line.Visible = true
                end
            end
        else
            for _, line in ipairs(espData.BoxLines) do
                if line then line.Visible = false end
            end
        end
    end

    -- ============================================================
    -- NAME + DISTANCE
    -- ============================================================
    local nameY = topPos.Y - 20
    if espData.Name then
        if Config.ESPName then
            espData.Name.Text = player.DisplayName or player.Name
            espData.Name.Position = Vector2.new(centerX, nameY)
            espData.Name.Color = nameTextColor
            espData.Name.Visible = true
        else
            espData.Name.Visible = false
        end
    end

    if espData.Distance then
        if Config.ESPDistance then
            espData.Distance.Text = string.format("[%dm]", math.floor(worldDist + 0.5))
            espData.Distance.Position = Vector2.new(centerX, nameY + 16)
            espData.Distance.Color = nameTextColor
            espData.Distance.Visible = true
        else
            espData.Distance.Visible = false
        end
    end

    -- ============================================================
    -- WEAPON TEXT (below box)
    -- ============================================================
    if espData.Weapon then
        if Config.ESPWeapon then
            local tool = char:FindFirstChildOfClass("Tool")
            if tool then
                espData.Weapon.Text = tool.Name
                espData.Weapon.Position = Vector2.new(centerX, bottomPos.Y + 6)
                espData.Weapon.Color = boxColor
                espData.Weapon.Visible = true
            else
                espData.Weapon.Visible = false
            end
        else
            espData.Weapon.Visible = false
        end
    end

    -- ============================================================
    -- HEAD DOT
    -- ============================================================
    if espData.HeadDot then
        if Config.ESPHeadDot then
            local headPos3D = head.Position
            local headScreen, headOnScreen = getScreenPos(headPos3D)
            if headOnScreen then
                local headRadius = math.max(3, boxWidth * 0.08)
                espData.HeadDot.Position = headScreen
                espData.HeadDot.Radius = headRadius
                espData.HeadDot.Color = boxColor
                espData.HeadDot.Visible = true
            else
                espData.HeadDot.Visible = false
            end
        else
            espData.HeadDot.Visible = false
        end
    end

    -- ============================================================
    -- HEALTH BAR (right side of box with gradient + outline)
    -- ============================================================
    local hpPercent = math.clamp(hum.Health / hum.MaxHealth, 0, 1)
    local barSide = Config.ESPHealthBarSide
    local barX = barSide == "right" and (centerX + boxWidth / 2 + 6) or (centerX - boxWidth / 2 - 6)
    local barTop = topPos.Y
    local barBottom = bottomPos.Y
    local barHeight = barBottom - barTop

    -- Health bar outline (subtle white glow)
    if espData.HPBarOutline then
        if Config.ESPHealth then
            espData.HPBarOutline.From = Vector2.new(barX, barTop - 1)
            espData.HPBarOutline.To = Vector2.new(barX, barBottom + 1)
            espData.HPBarOutline.Visible = true
        else
            espData.HPBarOutline.Visible = false
        end
    end

    -- Health bar background
    if espData.HPBarBg then
        if Config.ESPHealth then
            espData.HPBarBg.From = Vector2.new(barX, barTop)
            espData.HPBarBg.To = Vector2.new(barX, barBottom)
            espData.HPBarBg.Visible = true
        else
            espData.HPBarBg.Visible = false
        end
    end

    -- Health bar fill with smooth gradient
    if espData.HPBarFill then
        if Config.ESPHealth then
            local fillTop = barBottom - (barHeight * hpPercent)
            espData.HPBarFill.From = Vector2.new(barX, fillTop)
            espData.HPBarFill.To = Vector2.new(barX, barBottom)
            -- Smooth gradient: green(100)→yellow(60)→orange(30)→red(0)
            if hpPercent > 0.7 then
                local t = (hpPercent - 0.7) / 0.3
                espData.HPBarFill.Color = Color3.fromRGB(
                    math.floor(255 * (1 - t)), math.floor(200 + 55 * t), math.floor(40 + 40 * t)
                )
            elseif hpPercent > 0.35 then
                local t = (hpPercent - 0.35) / 0.35
                espData.HPBarFill.Color = Color3.fromRGB(
                    math.floor(255 * t), math.floor(200 - 55 * (1 - t)), math.floor(40 - 30 * (1 - t))
                )
            else
                local t = hpPercent / 0.35
                espData.HPBarFill.Color = Color3.fromRGB(
                    math.floor(200 + 55 * t), math.floor(40 * (1 - t)), math.floor(10 * (1 - t))
                )
            end
            espData.HPBarFill.Visible = true
        else
            espData.HPBarFill.Visible = false
        end
    end

    -- HP number next to bar
    if espData.HPText then
        if Config.ESPHealth then
            local hpX = barSide == "right" and (barX + 10) or (barX - 10)
            espData.HPText.Text = math.floor(hum.Health + 0.5)
            espData.HPText.Position = Vector2.new(hpX, barTop - 8)
            espData.HPText.Color = nameTextColor
            espData.HPText.Visible = true
        else
            espData.HPText.Visible = false
        end
    end

    -- Hide all health elements if disabled
    if not Config.ESPHealth then
        if espData.HPBarBg then espData.HPBarBg.Visible = false end
        if espData.HPBarFill then espData.HPBarFill.Visible = false end
        if espData.HPBarOutline then espData.HPBarOutline.Visible = false end
        if espData.HPText then espData.HPText.Visible = false end
    end

    -- ============================================================
    -- TRACER / SNAPLINE
    -- ============================================================
    if espData.Tracer then
        if Config.ESPTracer then
            local screenBottom = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y)
            espData.Tracer.From = screenBottom
            espData.Tracer.To = Vector2.new(centerX, bottomPos.Y)
            espData.Tracer.Color = boxColor
            espData.Tracer.Transparency = tracerAlpha
            espData.Tracer.Visible = true
        else
            espData.Tracer.Visible = false
        end
    end
end

-- ============================================================
-- SKELETON ESP
-- ============================================================
local SKELETON_CONNECTIONS = {
    {"Head", "UpperTorso"},
    {"UpperTorso", "LowerTorso"},
    {"UpperTorso", "LeftUpperArm"},
    {"UpperTorso", "RightUpperArm"},
    {"LeftUpperArm", "LeftLowerArm"},
    {"LeftUpperArm", "LeftHand"},
    {"RightUpperArm", "RightLowerArm"},
    {"RightUpperArm", "RightHand"},
    {"LowerTorso", "LeftUpperLeg"},
    {"LowerTorso", "RightUpperLeg"},
    {"LeftUpperLeg", "LeftLowerLeg"},
    {"LeftUpperLeg", "LeftFoot"},
    {"RightUpperLeg", "RightLowerLeg"},
    {"RightUpperLeg", "RightFoot"},
    -- R6 fallback
    {"Head", "Torso"},
    {"Torso", "Left Arm"},
    {"Torso", "Right Arm"},
    {"Torso", "Left Leg"},
    {"Torso", "Right Leg"},
}

local function createSkeleton(player)
    if player == LocalPlayer then return end
    if SkeletonObjects[player] then return end

    local lines = {}
    for i = 1, #SKELETON_CONNECTIONS do
        local line = Drawing and Drawing.new("Line")
        if line then
            line.Visible = false
            line.Color = Config.SkeletonColor
            line.Thickness = Config.SkeletonThickness
            line.Transparency = 0.85
        end
        table.insert(lines, line)
    end
    SkeletonObjects[player] = {Lines = lines}
end

local function removeSkeleton(player)
    local data = SkeletonObjects[player]
    if not data then return end
    pcall(function()
        for _, line in ipairs(data.Lines) do
            if line then line:Remove() end
        end
    end)
    SkeletonObjects[player] = nil
end

local function hideSkeleton(data)
    for _, line in ipairs(data.Lines) do
        if line then line.Visible = false end
    end
end

local function updateSkeleton(player)
    local data = SkeletonObjects[player]
    if not data then return end

    if not Config.SkeletonEnabled then hideSkeleton(data) return end

    local char = getCharacter(player)
    local hum = getHumanoid(player)
    if not char or not hum or hum.Health <= 0 then hideSkeleton(data) return end

    -- Team check: show teammates in a different color instead of hiding
    local skeletonColor = Config.SkeletonColor
    if Config.ESPTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
        skeletonColor = Config.ESPTeamColor
    end

    for i, conn in ipairs(SKELETON_CONNECTIONS) do
        local line = data.Lines[i]
        if line then
            local partA = char:FindFirstChild(conn[1])
            local partB = char:FindFirstChild(conn[2])

            if partA and partB then
                local posA, onScreenA = getScreenPos(partA.Position)
                local posB, onScreenB = getScreenPos(partB.Position)

                if onScreenA or onScreenB then
                    line.From = posA
                    line.To = posB
                    line.Color = skeletonColor
                    line.Thickness = Config.SkeletonThickness
                    line.Visible = true
                else
                    line.Visible = false
                end
            else
                line.Visible = false
            end
        end
    end
end

-- ============================================================
-- AIMBOT SYSTEM (Priority: Closest / Lowest HP)
-- ============================================================
-- Helper: get the active FOV for a given world distance
local function getActiveFOV(worldDist)
    if Config.AimbotDynamicFOV then
        local t = math.clamp(worldDist / math.max(Config.AimbotDynamicFOVDist, 1), 0, 1)
        return Config.AimbotDynamicFOVMax + (Config.AimbotDynamicFOVMin - Config.AimbotDynamicFOVMax) * t
    end
    return Config.AimbotFOV
end

local function getAimbotTarget()
    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
    local localRoot = getRootPart(LocalPlayer)

    -- Helper: get target part for a player
    local function getTargetPart(player)
        local char = getCharacter(player)
        if not char then return nil end
        if Config.AimbotTarget == "Head" then
            return char:FindFirstChild("Head")
        elseif Config.AimbotTarget == "HumanoidRootPart" then
            return char:FindFirstChild("HumanoidRootPart")
        elseif Config.AimbotTarget == "UpperTorso" then
            return char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso")
        end
        return nil
    end

    -- Helper: check if a player is a valid aim target
    local function isValidTarget(player)
        if player == LocalPlayer then return false end
        if not isAlive(player) then return false end
        if Config.AimbotTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then return false end
        return true
    end

    -- Helper: visibility check
    local function canSeeTarget(player, targetPart)
        if Config.AimbotWallbang then return true end
        local origin = Camera.CFrame.Position
        local direction = targetPart.Position - origin
        local rayParams = RaycastParams.new()
        rayParams.FilterType = Enum.RaycastFilterType.Exclude
        local filterList = {}
        if LocalPlayer.Character then table.insert(filterList, LocalPlayer.Character) end
        rayParams.FilterDescendantsInstances = filterList
        local result = workspace:Raycast(origin, direction, rayParams)
        if result then
            local hitPlayer = isPlayerFromPart(result.Instance)
            return hitPlayer == player
        end
        return true
    end

    -- Helper: compute score (lower = better)
    local function computeScore(player, targetPart)
        if Config.AimbotPriority == "lowest_hp" then
            local hum = getHumanoid(player)
            local hp = hum and hum.Health or math.huge
            -- Tiebreaker: if same HP, prefer closer target
            if hp >= math.huge then return hp end
            local wDist = 0
            if localRoot then
                wDist = (targetPart.Position - localRoot.Position).Magnitude
            end
            return hp + wDist * 0.001
        end
        -- Default: closest — combine world distance + screen distance
        local worldDist = 0
        if localRoot then
            worldDist = (targetPart.Position - localRoot.Position).Magnitude
        end
        local screenPos = getScreenPos(targetPart.Position)
        local screenDist = (screenPos - screenCenter).Magnitude
        return worldDist + screenDist * 0.5
    end

    -- Sticky: keep current target if still valid and no significantly better alternative
    if Config.AimbotStickyTarget and CurrentAimbotTarget then
        local stickyPlayer = CurrentAimbotTarget
        local stickyPart = getTargetPart(stickyPlayer)

        if stickyPart and isValidTarget(stickyPlayer) then
            local stickyScreenPos = getScreenPos(stickyPart.Position)
            local stickyFOVDist = (stickyScreenPos - screenCenter).Magnitude
            local stickyWorldDist = localRoot and (stickyPart.Position - localRoot.Position).Magnitude or 0
            local stickyFOV = getActiveFOV(stickyWorldDist)

            if stickyFOVDist <= stickyFOV and canSeeTarget(stickyPlayer, stickyPart) then
                local stickyScore = computeScore(stickyPlayer, stickyPart)

                -- Check if any new target is significantly better
                local bestNewScore = math.huge
                local bestNewPlayer = nil

                for _, player in ipairs(Players:GetPlayers()) do
                    if player ~= stickyPlayer and isValidTarget(player) then
                        local part = getTargetPart(player)
                        if part then
                            local sPos = getScreenPos(part.Position)
                            local fDist = (sPos - screenCenter).Magnitude
                            local wDist = localRoot and (part.Position - localRoot.Position).Magnitude or 0
                            local fov = getActiveFOV(wDist)

                            if fDist <= fov and canSeeTarget(player, part) then
                                local score = computeScore(player, part)
                                if score < bestNewScore then
                                    bestNewScore = score
                                    bestNewPlayer = player
                                end
                            end
                        end
                    end
                end

                -- Only switch if new target is significantly better (hysteresis)
                if bestNewPlayer and bestNewScore < stickyScore / Config.AimbotStickyThreshold then
                    CurrentAimbotTarget = bestNewPlayer
                    return getTargetPart(bestNewPlayer)
                end

                -- Keep current target
                return stickyPart
            end
        end

        -- Current target lost — reset
        CurrentAimbotTarget = nil
    end

    -- Standard selection (no sticky or sticky target lost)
    local bestTarget = nil
    local bestValue = math.huge

    for _, player in ipairs(Players:GetPlayers()) do
        if isValidTarget(player) then
            local targetPart = getTargetPart(player)
            if targetPart then
                local screenPos = getScreenPos(targetPart.Position)
                local fovDist = (screenPos - screenCenter).Magnitude
                local worldDist = localRoot and (targetPart.Position - localRoot.Position).Magnitude or 0
                local activeFOV = getActiveFOV(worldDist)

                if fovDist <= activeFOV and canSeeTarget(player, targetPart) then
                    local value = computeScore(player, targetPart)
                    if value < bestValue then
                        bestValue = value
                        bestTarget = player
                    end
                end
            end
        end
    end

    if bestTarget then
        CurrentAimbotTarget = bestTarget
        return getTargetPart(bestTarget)
    end

    return nil
end

local function doAimbot()
    if not Config.AimbotEnabled then return end

    if Config.AimbotOnFire then
        local isFiring = false
        pcall(function()
            isFiring = UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1)
        end)
        if not isFiring then return end
    end

    local target = getAimbotTarget()
    if not target then return end

    if not Camera or not Camera.CFrame then return end
    local currentCF = Camera.CFrame
    local targetPos = target.Position

    -- Prediction
    local velocity = Vector3.new(0, 0, 0)
    pcall(function()
        local root = target.Parent and target.Parent:FindFirstChild("HumanoidRootPart")
        if root then velocity = root.AssemblyLinearVelocity or root.Velocity or Vector3.zero end
    end)

    local dist = (targetPos - currentCF.Position).Magnitude
    local travelTime = dist / 500
    local predictedPos = targetPos + velocity * travelTime * 0.3

    -- Smooth aim
    local smooth = math.max(Config.AimbotSmooth, 0.01)
    local lookAt = currentCF:Lerp(CFrame.new(currentCF.Position, predictedPos), 1 / smooth)
    Camera.CFrame = lookAt
end

-- ============================================================
-- HITBOX SYSTEM
-- ============================================================
local originalSizes = {}
local originalColors = {}
local originalMaterials = {}

local function updateHitboxes()
    for _, player in ipairs(Players:GetPlayers()) do
        if player ~= LocalPlayer then
            local char = getCharacter(player)
            if char then
                local hum = getHumanoid(player)
                if hum and hum.Health > 0 then
                    if Config.HitboxEnabled then
                        for _, partName in ipairs({"HumanoidRootPart", "UpperTorso", "LowerTorso", "Torso"}) do
                            local part = char:FindFirstChild(partName)
                            if part and part:IsA("BasePart") then
                                if not originalSizes[player] then originalSizes[player] = {} end
                                if not originalColors[player] then originalColors[player] = {} end
                                if not originalMaterials[player] then originalMaterials[player] = {} end
                                if not originalSizes[player][partName] then
                                    originalSizes[player][partName] = part.Size
                                    originalColors[player][partName] = part.Color
                                    originalMaterials[player][partName] = part.Material
                                end
                                pcall(function()
                                    part.Size = Vector3.new(Config.HitboxSize, Config.HitboxSize, Config.HitboxSize)
                                    part.Transparency = 0.7
                                    part.CanCollide = false
                                    part.Material = Enum.Material.ForceField
                                    part.Color = Color3.fromRGB(255, 0, 0)
                                end)
                            end
                        end
                    else
                        -- Restore only body parts (HumanoidRootPart, UpperTorso, LowerTorso, Torso)
                        -- Don't wipe the entire table — head hitbox may still be active
                        if originalSizes[player] then
                            for _, partName in ipairs({"HumanoidRootPart", "UpperTorso", "LowerTorso", "Torso"}) do
                                if originalSizes[player][partName] then
                                    local part = char:FindFirstChild(partName)
                                    if part and part:IsA("BasePart") then
                                        pcall(function()
                                            part.Size = originalSizes[player][partName]
                                            part.Transparency = 0
                                            part.Material = (originalMaterials[player] and originalMaterials[player][partName]) or Enum.Material.Plastic
                                            if originalColors[player] and originalColors[player][partName] then
                                                part.Color = originalColors[player][partName]
                                            end
                                        end)
                                    end
                                    originalSizes[player][partName] = nil
                                    if originalColors[player] then originalColors[player][partName] = nil end
                                    if originalMaterials[player] then originalMaterials[player][partName] = nil end
                                end
                            end
                        end
                    end

                    -- Head Hitbox
                    local head = char:FindFirstChild("Head")
                    if head and head:IsA("BasePart") then
                        if Config.HeadHitboxEnabled then
                            if not originalSizes[player] then originalSizes[player] = {} end
                            if not originalColors[player] then originalColors[player] = {} end
                            if not originalMaterials[player] then originalMaterials[player] = {} end
                            if not originalSizes[player]["Head"] then
                                originalSizes[player]["Head"] = head.Size
                                originalColors[player]["Head"] = head.Color
                                originalMaterials[player]["Head"] = head.Material
                            end
                            pcall(function()
                                head.Size = Vector3.new(Config.HeadHitboxSize, Config.HeadHitboxSize, Config.HeadHitboxSize)
                                head.Transparency = 0.7
                                head.CanCollide = false
                                head.Material = Enum.Material.Neon
                                head.Color = Color3.fromRGB(255, 255, 0)
                            end)
                        else
                            if originalSizes[player] and originalSizes[player]["Head"] then
                                pcall(function()
                                    head.Size = originalSizes[player]["Head"]
                                    head.Transparency = 0
                                    head.Material = (originalMaterials[player] and originalMaterials[player]["Head"]) or Enum.Material.Plastic
                                    if originalColors[player] and originalColors[player]["Head"] then
                                        head.Color = originalColors[player]["Head"]
                                    end
                                end)
                                originalSizes[player]["Head"] = nil
                                if originalColors[player] then originalColors[player]["Head"] = nil end
                                if originalMaterials[player] then originalMaterials[player]["Head"] = nil end
                            end
                        end
                    end
                end -- hum.Health check
            end -- char check
        end -- player check
    end
end

-- ============================================================
-- PLAYER MODS
-- ============================================================
local function applySpeed()
    local hum = getHumanoid(LocalPlayer)
    if hum then
        pcall(function()
            hum.WalkSpeed = Config.SpeedEnabled and Config.SpeedValue or 16
        end)
    end
end

local function applyJump()
    local hum = getHumanoid(LocalPlayer)
    if hum then
        pcall(function()
            if Config.JumpEnabled then
                hum.UseJumpPower = true
                hum.JumpPower = Config.JumpValue
            else
                hum.JumpPower = 50
            end
        end)
    end
end

local function enableNoclip()
    if NoclipConnection then return end
    NoclipConnection = RunService.Stepped:Connect(function()
        if not Config.NoclipEnabled then return end
        local char = LocalPlayer.Character
        if not char then return end
        for _, part in ipairs(char:GetDescendants()) do
            if part:IsA("BasePart") then
                part.CanCollide = false
            end
        end
    end)
end

local function disableNoclip()
    if NoclipConnection then
        NoclipConnection:Disconnect()
        NoclipConnection = nil
    end
end

-- ============================================================
-- INFINITE JUMP
-- ============================================================
local InfiniteJumpConnection = nil

local function enableInfiniteJump()
    if InfiniteJumpConnection then return end
    InfiniteJumpConnection = UserInputService.JumpRequest:Connect(function()
        if not Config.InfiniteJumpEnabled then return end
        local char = LocalPlayer.Character
        if not char then return end
        local hum = char:FindFirstChildOfClass("Humanoid")
        if hum then
            hum:ChangeState(Enum.HumanoidStateType.Jumping)
        end
    end)
end

local function disableInfiniteJump()
    if InfiniteJumpConnection then
        InfiniteJumpConnection:Disconnect()
        InfiniteJumpConnection = nil
    end
end

-- ============================================================
-- ANTI-AFK
-- ============================================================
local function enableAntiAFK()
    if AntiAFKConnection then return end
    local VirtualUser = game:GetService("VirtualUser")
    AntiAFKConnection = Players.LocalPlayer.Idled:Connect(function()
        if Config.AntiAFKEnabled then
            pcall(function()
                VirtualUser:CaptureController()
                VirtualUser:ClickButton2(Vector2.new())
            end)
        end
    end)
end

local function disableAntiAFK()
    if AntiAFKConnection then
        AntiAFKConnection:Disconnect()
        AntiAFKConnection = nil
    end
end

-- ============================================================
-- SILENT AIM FOV CIRCLE
-- ============================================================
local function createSilentAimFOVCircle()
    if SilentAimFOVCircle then SilentAimFOVCircle:Remove() end
    SilentAimFOVCircle = Drawing and Drawing.new("Circle")
    if SilentAimFOVCircle then
        SilentAimFOVCircle.Visible = false
        SilentAimFOVCircle.Color = Color3.fromRGB(255, 100, 100)
        SilentAimFOVCircle.Thickness = 1.5
        SilentAimFOVCircle.Transparency = 0.7
        SilentAimFOVCircle.Filled = false
        SilentAimFOVCircle.NumSides = 64
        SilentAimFOVCircle.Radius = Config.SilentAimFOV
    end
end

local function updateSilentAimFOVCircle()
    if not SilentAimFOVCircle then return end
    if Config.SilentAimShowFOV and Config.SilentAimEnabled then
        SilentAimFOVCircle.Position = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
        SilentAimFOVCircle.Radius = Config.SilentAimFOV
        SilentAimFOVCircle.Visible = true
    else
        SilentAimFOVCircle.Visible = false
    end
end

-- ============================================================
-- FOV CIRCLE
-- ============================================================
local function createFOVCircle()
    if FOVCircle then FOVCircle:Remove() end
    FOVCircle = Drawing and Drawing.new("Circle")
    if FOVCircle then
        FOVCircle.Visible = false
        FOVCircle.Color = Color3.fromRGB(255, 255, 255)
        FOVCircle.Thickness = 1.5
        FOVCircle.Transparency = 0.7
        FOVCircle.Filled = false
        FOVCircle.NumSides = 64
        FOVCircle.Radius = Config.AimbotFOV
    end
end

local function updateFOVCircle()
    if not FOVCircle then return end
    if Config.AimbotShowFOV and Config.AimbotEnabled then
        FOVCircle.Position = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)

        if Config.AimbotDynamicFOV then
            -- Show dynamic FOV based on current target distance
            local radius = (Config.AimbotDynamicFOVMin + Config.AimbotDynamicFOVMax) / 2
            if CurrentAimbotTarget and isAlive(CurrentAimbotTarget) then
                local localRoot = getRootPart(LocalPlayer)
                local targetRoot = getRootPart(CurrentAimbotTarget)
                if localRoot and targetRoot then
                    local dist = (targetRoot.Position - localRoot.Position).Magnitude
                    local t = math.clamp(dist / math.max(Config.AimbotDynamicFOVDist, 1), 0, 1)
                    radius = Config.AimbotDynamicFOVMax + (Config.AimbotDynamicFOVMin - Config.AimbotDynamicFOVMax) * t
                end
            end
            FOVCircle.Radius = radius
        else
            FOVCircle.Radius = Config.AimbotFOV
        end

        FOVCircle.Visible = true
    else
        FOVCircle.Visible = false
    end
end

-- ============================================================
-- ============================================================
-- UI SYSTEM (v21.3 — Liquid Glass Style)
-- ============================================================
