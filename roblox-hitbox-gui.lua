-- Hoàng Anh Hub v21.3
-- Features: ESP (Corner Box/Name/Distance/HP/Head Dot/Tracer/Skeleton),
-- Aimbot (Gần nhất/Máu thấp nhất), Silent Aim, TriggerBot, Chams,
-- Wallbang (Xuyên vật thể), Hitbox, Player Mods,
-- Speed, Jump, Noclip, Infinite Jump, Anti-AFK, Keybind System
-- Liquid Glass UI, Left Sidebar, Modern Glassmorphism Style
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

    -- Get bounding box via proper 3D→2D projection (all 8 corners)
    local head = char:FindFirstChild("Head")
    if not head then hideESP(espData) return end

    -- Compute 3D bounding box from all character BaseParts
    local minVec = Vector3.new(math.huge, math.huge, math.huge)
    local maxVec = Vector3.new(-math.huge, -math.huge, -math.huge)
    local hasPart = false
    for _, part in ipairs(char:GetDescendants()) do
        if part:IsA("BasePart") then
            hasPart = true
            local cf = part.CFrame
            local hs = part.Size / 2
            local partCorners = {
                cf * Vector3.new(-hs.X, -hs.Y, -hs.Z),
                cf * Vector3.new(-hs.X, -hs.Y,  hs.Z),
                cf * Vector3.new(-hs.X,  hs.Y, -hs.Z),
                cf * Vector3.new(-hs.X,  hs.Y,  hs.Z),
                cf * Vector3.new( hs.X, -hs.Y, -hs.Z),
                cf * Vector3.new( hs.X, -hs.Y,  hs.Z),
                cf * Vector3.new( hs.X,  hs.Y, -hs.Z),
                cf * Vector3.new( hs.X,  hs.Y,  hs.Z),
            }
            for _, c in ipairs(partCorners) do
                minVec = Vector3.new(math.min(minVec.X, c.X), math.min(minVec.Y, c.Y), math.min(minVec.Z, c.Z))
                maxVec = Vector3.new(math.max(maxVec.X, c.X), math.max(maxVec.Y, c.Y), math.max(maxVec.Z, c.Z))
            end
        end
    end
    if not hasPart then hideESP(espData) return end

    -- Project all 8 corners of the 3D bounding box to 2D screen space
    local bbCorners3D = {
        Vector3.new(minVec.X, minVec.Y, minVec.Z),
        Vector3.new(minVec.X, minVec.Y, maxVec.Z),
        Vector3.new(minVec.X, maxVec.Y, minVec.Z),
        Vector3.new(minVec.X, maxVec.Y, maxVec.Z),
        Vector3.new(maxVec.X, minVec.Y, minVec.Z),
        Vector3.new(maxVec.X, minVec.Y, maxVec.Z),
        Vector3.new(maxVec.X, maxVec.Y, minVec.Z),
        Vector3.new(maxVec.X, maxVec.Y, maxVec.Z),
    }

    local screenCorners = {}
    local anyOnScreen = false
    for _, c3 in ipairs(bbCorners3D) do
        local pos, onScreen = Camera:WorldToViewportPoint(c3)
        if pos.Z > 0 then -- only include points in front of camera
            table.insert(screenCorners, Vector2.new(pos.X, pos.Y))
            if onScreen then anyOnScreen = true end
        end
    end
    if #screenCorners == 0 or not anyOnScreen then hideESP(espData) return end

    local minX, minY = math.huge, math.huge
    local maxX, maxY = -math.huge, -math.huge
    for _, sp in ipairs(screenCorners) do
        minX = math.min(minX, sp.X)
        maxX = math.max(maxX, sp.X)
        minY = math.min(minY, sp.Y)
        maxY = math.max(maxY, sp.Y)
    end

    local topPos = Vector2.new((minX + maxX) / 2, minY)
    local bottomPos = Vector2.new((minX + maxX) / 2, maxY)

    local boxHeight = math.abs(maxY - minY)
    local boxWidth = math.abs(maxX - minX)
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
            espData.Tracer.To = Vector2.new(centerX, (minY + maxY) / 2)
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
-- ============================================================
-- UI SYSTEM (v22 — Clean Glass Style, Mobile-Responsive)
-- ============================================================
-- Mobile Detection & Responsive Sizing
-- ============================================================
local isMobile = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
local menuScale = math.clamp(Camera.ViewportSize.X / 800, 0.65, 1)
local menuW = math.floor(500 * menuScale)
local menuH = math.floor(400 * menuScale)
local sidebarW = 70

-- ============================================================
-- Clean Glass Color Palette
-- ============================================================
local GLASS = {
    Background = Color3.fromRGB(245, 248, 255),
    PanelBG = Color3.fromRGB(255, 255, 255),
    AccentPrimary = Color3.fromRGB(70, 130, 255),
    AccentSecondary = Color3.fromRGB(120, 170, 255),
    TextPrimary = Color3.fromRGB(20, 30, 60),
    TextSecondary = Color3.fromRGB(100, 115, 145),
    TextDisabled = Color3.fromRGB(175, 185, 210),
    ToggleOff = Color3.fromRGB(200, 210, 230),
    ToggleOn = Color3.fromRGB(70, 130, 255),
    SliderTrack = Color3.fromRGB(225, 232, 248),
    Danger = Color3.fromRGB(235, 72, 92),
    GlassEdge = Color3.fromRGB(255, 255, 255),
    GlassShadow = Color3.fromRGB(180, 195, 225),
    TitleBarBG = Color3.fromRGB(240, 244, 255),
}
local CORNER = UDim.new(0, 10)
local TWEEN_FAST = TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local TWEEN_OPEN = TweenInfo.new(0.3, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local TWEEN_GLOW = TweenInfo.new(2.0, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)

local function createUI()
    -- Destroy old UI
    local oldGui = LocalPlayer.PlayerGui:FindFirstChild("HoangAnhHub")
    if oldGui then oldGui:Destroy() end

    local gui = Instance.new("ScreenGui")
    gui.Name = "HoangAnhHub"
    gui.ResetOnSpawn = false
    gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    gui.DisplayOrder = 999999
    pcall(function() gui.IgnoreGuiInset = true end)
    gui.Parent = LocalPlayer.PlayerGui

    -- ============================================================
    -- MAIN FRAME (responsive sizing)
    -- ============================================================
    local mainFrame = Instance.new("Frame")
    mainFrame.Name = "MainFrame"
    mainFrame.Size = UDim2.new(0, menuW, 0, menuH)
    mainFrame.Position = UDim2.new(0.5, -menuW / 2, 0.5, -menuH / 2)
    mainFrame.BackgroundColor3 = GLASS.PanelBG
    mainFrame.BackgroundTransparency = 0.25
    mainFrame.BorderSizePixel = 0
    mainFrame.ClipsDescendants = true
    mainFrame.Visible = false
    mainFrame.Parent = gui

    Instance.new("UICorner", mainFrame).CornerRadius = CORNER

    -- Clean Glass edge layers: white edge + soft shadow + ambient glow
    local stroke1 = Instance.new("UIStroke")
    stroke1.Color = GLASS.GlassEdge
    stroke1.Thickness = 1
    stroke1.Transparency = 0.15
    stroke1.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    stroke1.Parent = mainFrame

    local stroke2 = Instance.new("UIStroke")
    stroke2.Color = GLASS.GlassShadow
    stroke2.Thickness = 3
    stroke2.Transparency = 0.55
    stroke2.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    stroke2.Parent = mainFrame

    local stroke3 = Instance.new("UIStroke")
    stroke3.Color = GLASS.AccentPrimary
    stroke3.Thickness = 5
    stroke3.Transparency = 0.85
    stroke3.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    stroke3.Parent = mainFrame
    TweenService:Create(stroke3, TWEEN_GLOW, {Transparency = 0.65}):Play()

    -- ============================================================
    -- OPEN/CLOSE ANIMATION
    -- ============================================================
    local function showMenu()
        mainFrame.Visible = true
        mainFrame.BackgroundTransparency = 1
        TweenService:Create(mainFrame, TWEEN_OPEN, {
            BackgroundTransparency = 0.25
        }):Play()
    end

    local function hideMenu()
        local tween = TweenService:Create(mainFrame, TWEEN_OPEN, {
            BackgroundTransparency = 1
        })
        tween:Play()
        tween.Completed:Connect(function()
            if mainFrame.BackgroundTransparency >= 1 then
                mainFrame.Visible = false
                mainFrame.BackgroundTransparency = 0.25
            end
        end)
    end

    -- ============================================================
    -- TITLE BAR
    -- ============================================================
    local titleBar = Instance.new("Frame")
    titleBar.Name = "TitleBar"
    titleBar.Size = UDim2.new(1, 0, 0, 36)
    titleBar.BackgroundColor3 = GLASS.TitleBarBG
    titleBar.BackgroundTransparency = 0
    titleBar.BorderSizePixel = 0
    titleBar.Parent = mainFrame

    -- Subtle accent line at bottom of title bar
    local accentLine = Instance.new("Frame")
    accentLine.Size = UDim2.new(1, 0, 0, 1)
    accentLine.Position = UDim2.new(0, 0, 1, -1)
    accentLine.BackgroundColor3 = GLASS.AccentPrimary
    accentLine.BackgroundTransparency = 0.3
    accentLine.BorderSizePixel = 0
    accentLine.Parent = titleBar

    -- Title text
    local titleLabel = Instance.new("TextLabel")
    titleLabel.Size = UDim2.new(1, -80, 1, 0)
    titleLabel.Position = UDim2.new(0, 12, 0, 0)
    titleLabel.BackgroundTransparency = 1
    titleLabel.Text = "HOÀNG ANH HUB v22"
    titleLabel.TextColor3 = GLASS.AccentPrimary
    titleLabel.TextSize = 14
    titleLabel.Font = Enum.Font.GothamBold
    titleLabel.TextXAlignment = Enum.TextXAlignment.Left
    titleLabel.Parent = titleBar

    -- Close button
    local closeBtn = Instance.new("TextButton")
    closeBtn.Size = UDim2.new(0, 30, 0, 30)
    closeBtn.Position = UDim2.new(1, -34, 0, 3)
    closeBtn.BackgroundColor3 = GLASS.Danger
    closeBtn.Text = "✕"
    closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    closeBtn.TextSize = 12
    closeBtn.Font = Enum.Font.GothamBold
    closeBtn.AutoButtonColor = false
    closeBtn.Parent = titleBar
    Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 8)

    -- Minimize button
    local minBtn = Instance.new("TextButton")
    minBtn.Size = UDim2.new(0, 30, 0, 30)
    minBtn.Position = UDim2.new(1, -68, 0, 3)
    minBtn.BackgroundColor3 = GLASS.TextDisabled
    minBtn.BackgroundTransparency = 0.5
    minBtn.Text = "—"
    minBtn.TextColor3 = GLASS.TextSecondary
    minBtn.TextSize = 12
    minBtn.Font = Enum.Font.GothamBold
    minBtn.AutoButtonColor = false
    minBtn.Parent = titleBar
    Instance.new("UICorner", minBtn).CornerRadius = UDim.new(0, 8)

    -- ============================================================
    -- LEFT SIDEBAR
    -- ============================================================
    local sidebar = Instance.new("Frame")
    sidebar.Name = "Sidebar"
    sidebar.Size = UDim2.new(0, sidebarW, 1, -36)
    sidebar.Position = UDim2.new(0, 0, 0, 36)
    sidebar.BackgroundColor3 = GLASS.PanelBG
    sidebar.BackgroundTransparency = 0.08
    sidebar.BorderSizePixel = 0
    sidebar.Parent = mainFrame

    -- Sidebar layout
    local sidebarLayout = Instance.new("UIListLayout")
    sidebarLayout.SortOrder = Enum.SortOrder.LayoutOrder
    sidebarLayout.Padding = UDim.new(0, 2)
    sidebarLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
    sidebarLayout.Parent = sidebar

    -- Sidebar right border accent
    local sidebarBorder = Instance.new("Frame")
    sidebarBorder.Size = UDim2.new(0, 1, 1, 0)
    sidebarBorder.Position = UDim2.new(1, -1, 0, 0)
    sidebarBorder.BackgroundColor3 = GLASS.AccentPrimary
    sidebarBorder.BackgroundTransparency = 0.7
    sidebarBorder.BorderSizePixel = 0
    sidebarBorder.Parent = sidebar

    -- ============================================================
    -- CONTENT AREA
    -- ============================================================
    local contentArea = Instance.new("Frame")
    contentArea.Name = "ContentArea"
    contentArea.Size = UDim2.new(1, -sidebarW, 1, -36)
    contentArea.Position = UDim2.new(0, sidebarW, 0, 36)
    contentArea.BackgroundTransparency = 1
    contentArea.BorderSizePixel = 0
    contentArea.Parent = mainFrame

    -- ============================================================
    -- TAB SYSTEM (6 tabs: ESP, Aimbot, Combat, Hitbox, Player, Misc)
    -- ============================================================
    local tabs = {}
    local tabNames = {"ESP", "Aimbot", "Combat", "Hitbox", "Player", "Misc"}
    local tabIcons = {"👁", "🎯", "⚔", "▣", "🏃", "⚙"}
    local currentTab = "ESP"
    local tabButtons = {}

    for i, name in ipairs(tabNames) do
        -- Content ScrollingFrame
        local tabContent = Instance.new("ScrollingFrame")
        tabContent.Name = name
        tabContent.Size = UDim2.new(1, 0, 1, 0)
        tabContent.BackgroundTransparency = 1
        tabContent.ScrollBarThickness = 3
        tabContent.ScrollBarImageColor3 = GLASS.AccentPrimary
        tabContent.BorderSizePixel = 0
        tabContent.CanvasSize = UDim2.new(0, 0, 0, 0)
        tabContent.AutomaticCanvasSize = Enum.AutomaticSize.Y
        tabContent.Visible = (name == currentTab)
        tabContent.Parent = contentArea

        local layout = Instance.new("UIListLayout")
        layout.SortOrder = Enum.SortOrder.LayoutOrder
        layout.Padding = UDim.new(0, 6)
        layout.Parent = tabContent

        local pad = Instance.new("UIPadding")
        pad.PaddingTop = UDim.new(0, 8)
        pad.PaddingLeft = UDim.new(0, 10)
        pad.PaddingRight = UDim.new(0, 10)
        pad.PaddingBottom = UDim.new(0, 8)
        pad.Parent = tabContent

        tabs[name] = tabContent

        -- Sidebar tab button
        local tabBtn = Instance.new("TextButton")
        tabBtn.Name = "Tab_" .. name
        tabBtn.Size = UDim2.new(1, -6, 0, 46)
        tabBtn.BackgroundColor3 = GLASS.AccentPrimary
        tabBtn.BackgroundTransparency = (name == currentTab) and 0.85 or 1
        tabBtn.Text = ""
        tabBtn.AutoButtonColor = false
        tabBtn.LayoutOrder = i
        tabBtn.Parent = sidebar
        Instance.new("UICorner", tabBtn).CornerRadius = UDim.new(0, 8)

        -- Active accent bar (left edge)
        local activeBar = Instance.new("Frame")
        activeBar.Name = "ActiveBar"
        activeBar.Size = UDim2.new(0, 3, 0.6, 0)
        activeBar.Position = UDim2.new(0, 1, 0.2, 0)
        activeBar.BackgroundColor3 = GLASS.AccentPrimary
        activeBar.BackgroundTransparency = (name == currentTab) and 0 or 1
        activeBar.BorderSizePixel = 0
        activeBar.Parent = tabBtn
        Instance.new("UICorner", activeBar).CornerRadius = UDim.new(0, 2)

        -- Glow stroke for active tab
        local tabGlow = Instance.new("UIStroke")
        tabGlow.Color = GLASS.AccentPrimary
        tabGlow.Thickness = 1.5
        tabGlow.Transparency = (name == currentTab) and 0.5 or 1
        tabGlow.Parent = tabBtn

        -- Icon label
        local icon = Instance.new("TextLabel")
        icon.Name = "Icon"
        icon.Size = UDim2.new(1, 0, 0, 24)
        icon.Position = UDim2.new(0, 0, 0, 4)
        icon.BackgroundTransparency = 1
        icon.Text = tabIcons[i]
        icon.TextSize = 18
        icon.Font = Enum.Font.GothamBold
        icon.TextColor3 = (name == currentTab) and GLASS.AccentPrimary or GLASS.TextDisabled
        icon.Parent = tabBtn

        -- Tab text label
        local tabLabel = Instance.new("TextLabel")
        tabLabel.Name = "Label"
        tabLabel.Size = UDim2.new(1, 0, 0, 12)
        tabLabel.Position = UDim2.new(0, 0, 0, 28)
        tabLabel.BackgroundTransparency = 1
        tabLabel.Text = string.upper(name)
        tabLabel.TextSize = 7
        tabLabel.Font = Enum.Font.GothamBold
        tabLabel.TextColor3 = (name == currentTab) and GLASS.AccentPrimary or GLASS.TextDisabled
        tabLabel.Parent = tabBtn

        tabButtons[name] = {
            button = tabBtn,
            icon = icon,
            label = tabLabel,
            activeBar = activeBar,
            glow = tabGlow,
        }

        -- Tab click handler
        tabBtn.MouseButton1Click:Connect(function()
            for tabName, frame in pairs(tabs) do
                frame.Visible = (tabName == name)
            end
            for tabName, btnData in pairs(tabButtons) do
                local isActive = (tabName == name)
                TweenService:Create(btnData.button, TWEEN_FAST, {
                    BackgroundTransparency = isActive and 0.85 or 1
                }):Play()
                TweenService:Create(btnData.activeBar, TWEEN_FAST, {
                    BackgroundTransparency = isActive and 0 or 1
                }):Play()
                TweenService:Create(btnData.glow, TWEEN_FAST, {
                    Transparency = isActive and 0.5 or 1
                }):Play()
                btnData.icon.TextColor3 = isActive and GLASS.AccentPrimary or GLASS.TextDisabled
                btnData.label.TextColor3 = isActive and GLASS.AccentPrimary or GLASS.TextDisabled
            end
            currentTab = name
        end)
    end

    -- ============================================================
    -- UI HELPER: Section Header
    -- ============================================================
    local function addSectionHeader(parent, text, order)
        local header = Instance.new("Frame")
        header.Name = "Header_" .. text
        header.Size = UDim2.new(1, 0, 0, 30)
        header.BackgroundColor3 = GLASS.PanelBG
        header.BackgroundTransparency = 0.25
        header.BorderSizePixel = 0
        header.LayoutOrder = order
        header.Parent = parent
        Instance.new("UICorner", header).CornerRadius = CORNER

        -- Left accent bar
        local accentBar = Instance.new("Frame")
        accentBar.Size = UDim2.new(0, 3, 0.65, 0)
        accentBar.Position = UDim2.new(0, 0, 0.175, 0)
        accentBar.BackgroundColor3 = GLASS.AccentPrimary
        accentBar.BorderSizePixel = 0
        accentBar.Parent = header

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, -16, 1, 0)
        label.Position = UDim2.new(0, 12, 0, 0)
        label.BackgroundTransparency = 1
        label.Text = string.upper(text)
        label.TextColor3 = GLASS.AccentPrimary
        label.TextSize = 12
        label.Font = Enum.Font.GothamBold
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = header
    end

    -- ============================================================
    -- UI HELPER: Toggle Switch
    -- ============================================================
    local function addToggle(parent, text, default, order, callback)
        local frame = Instance.new("Frame")
        frame.Name = "Toggle_" .. text
        frame.Size = UDim2.new(1, 0, 0, 38)
        frame.BackgroundColor3 = GLASS.PanelBG
        frame.BackgroundTransparency = 0.2
        frame.BorderSizePixel = 0
        frame.LayoutOrder = order
        frame.Parent = parent
        Instance.new("UICorner", frame).CornerRadius = CORNER

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, -64, 1, 0)
        label.Position = UDim2.new(0, 12, 0, 0)
        label.BackgroundTransparency = 1
        label.Text = text
        label.TextColor3 = GLASS.TextPrimary
        label.TextSize = 12
        label.Font = Enum.Font.Gotham
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = frame

        -- Toggle track
        local track = Instance.new("Frame")
        track.Size = UDim2.new(0, 44, 0, 22)
        track.Position = UDim2.new(1, -54, 0.5, -11)
        track.BackgroundColor3 = default and GLASS.ToggleOn or GLASS.ToggleOff
        track.BorderSizePixel = 0
        track.Parent = frame
        Instance.new("UICorner", track).CornerRadius = UDim.new(1, 0)

        -- Thumb
        local thumb = Instance.new("Frame")
        thumb.Size = UDim2.new(0, 18, 0, 18)
        thumb.Position = default and UDim2.new(1, -20, 0.5, -9) or UDim2.new(0, 2, 0.5, -9)
        thumb.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
        thumb.BorderSizePixel = 0
        thumb.Parent = track
        Instance.new("UICorner", thumb).CornerRadius = UDim.new(1, 0)

        -- Thumb glow stroke
        local thumbGlow = Instance.new("UIStroke")
        thumbGlow.Color = GLASS.AccentPrimary
        thumbGlow.Thickness = 2
        thumbGlow.Transparency = default and 0.3 or 1
        thumbGlow.Parent = thumb

        local state = default

        local clickBtn = Instance.new("TextButton")
        clickBtn.Size = UDim2.new(1, 0, 1, 0)
        clickBtn.BackgroundTransparency = 1
        clickBtn.Text = ""
        clickBtn.Parent = frame

        local function animateToggle(val)
            TweenService:Create(track, TWEEN_FAST, {
                BackgroundColor3 = val and GLASS.ToggleOn or GLASS.ToggleOff
            }):Play()
            TweenService:Create(thumb, TWEEN_FAST, {
                Position = val and UDim2.new(1, -20, 0.5, -9) or UDim2.new(0, 2, 0.5, -9),
                BackgroundColor3 = Color3.fromRGB(255, 255, 255)
            }):Play()
            TweenService:Create(thumbGlow, TWEEN_FAST, {
                Transparency = val and 0.3 or 1
            }):Play()
        end

        clickBtn.MouseButton1Click:Connect(function()
            state = not state
            animateToggle(state)
            if callback then callback(state) end
        end)

        return {Set = function(val)
            state = val
            animateToggle(val)
        end, Get = function()
            return state
        end, Name = text}
    end

    -- ============================================================
    -- UI HELPER: Slider
    -- ============================================================
    local function addSlider(parent, text, min, max, default, order, callback)
        local frame = Instance.new("Frame")
        frame.Name = "Slider_" .. text
        frame.Size = UDim2.new(1, 0, 0, 52)
        frame.BackgroundColor3 = GLASS.PanelBG
        frame.BackgroundTransparency = 0.2
        frame.BorderSizePixel = 0
        frame.LayoutOrder = order
        frame.Parent = parent
        Instance.new("UICorner", frame).CornerRadius = CORNER

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, -24, 0, 20)
        label.Position = UDim2.new(0, 12, 0, 4)
        label.BackgroundTransparency = 1
        label.Text = text .. ": " .. default
        label.TextColor3 = GLASS.TextPrimary
        label.TextSize = 12
        label.Font = Enum.Font.Gotham
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = frame

        -- Slider track
        local sliderTrack = Instance.new("Frame")
        sliderTrack.Size = UDim2.new(1, -24, 0, 6)
        sliderTrack.Position = UDim2.new(0, 12, 0, 34)
        sliderTrack.BackgroundColor3 = GLASS.SliderTrack
        sliderTrack.BorderSizePixel = 0
        sliderTrack.Parent = frame
        Instance.new("UICorner", sliderTrack).CornerRadius = UDim.new(0, 3)

        -- Fill bar with gradient
        local percent = (default - min) / (max - min)
        local sliderFill = Instance.new("Frame")
        sliderFill.Size = UDim2.new(percent, 0, 1, 0)
        sliderFill.BackgroundColor3 = GLASS.AccentPrimary
        sliderFill.BorderSizePixel = 0
        sliderFill.Parent = sliderTrack
        Instance.new("UICorner", sliderFill).CornerRadius = UDim.new(0, 3)

        local fillGrad = Instance.new("UIGradient")
        fillGrad.Color = ColorSequence.new({
            ColorSequenceKeypoint.new(0, GLASS.AccentSecondary),
            ColorSequenceKeypoint.new(1, GLASS.AccentPrimary)
        })
        fillGrad.Parent = sliderFill

        -- Thumb
        local sliderBtn = Instance.new("TextButton")
        sliderBtn.Size = UDim2.new(0, 14, 0, 14)
        sliderBtn.Position = UDim2.new(percent, -7, 0.5, -7)
        sliderBtn.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
        sliderBtn.Text = ""
        sliderBtn.AutoButtonColor = false
        sliderBtn.BorderSizePixel = 0
        sliderBtn.ZIndex = 3
        sliderBtn.Parent = sliderTrack
        Instance.new("UICorner", sliderBtn).CornerRadius = UDim.new(1, 0)

        local sliderGlow = Instance.new("UIStroke")
        sliderGlow.Color = GLASS.AccentPrimary
        sliderGlow.Thickness = 2
        sliderGlow.Transparency = 0.35
        sliderGlow.Parent = sliderBtn

        local dragging = false
        local currentValue = default

        sliderBtn.MouseButton1Down:Connect(function()
            dragging = true
        end)

        local endConn = UserInputService.InputEnded:Connect(function(input)
            if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
                dragging = false
            end
        end)
        table.insert(Connections, endConn)

        local changeConn = UserInputService.InputChanged:Connect(function(input)
            if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
                local pos = input.Position
                local absPos = sliderTrack.AbsolutePosition
                local absSize = sliderTrack.AbsoluteSize
                local relX = math.clamp((pos.X - absPos.X) / absSize.X, 0, 1)
                currentValue = math.floor(min + (max - min) * relX + 0.5)
                sliderFill.Size = UDim2.new(relX, 0, 1, 0)
                sliderBtn.Position = UDim2.new(relX, -7, 0.5, -7)
                label.Text = text .. ": " .. currentValue
                if callback then callback(currentValue) end
            end
        end)
        table.insert(Connections, changeConn)

        return {Set = function(val)
            currentValue = val
            local p = (val - min) / (max - min)
            sliderFill.Size = UDim2.new(p, 0, 1, 0)
            sliderBtn.Position = UDim2.new(p, -7, 0.5, -7)
            label.Text = text .. ": " .. val
        end}
    end

    -- ============================================================
    -- UI HELPER: Dropdown
    -- ============================================================
    local function addDropdown(parent, text, options, default, order, callback)
        local frame = Instance.new("Frame")
        frame.Name = "Dropdown_" .. text
        frame.Size = UDim2.new(1, 0, 0, 38)
        frame.BackgroundColor3 = GLASS.PanelBG
        frame.BackgroundTransparency = 0.2
        frame.BorderSizePixel = 0
        frame.LayoutOrder = order
        frame.ClipsDescendants = true
        frame.Parent = parent
        Instance.new("UICorner", frame).CornerRadius = CORNER

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(0.5, 0, 0, 38)
        label.Position = UDim2.new(0, 12, 0, 0)
        label.BackgroundTransparency = 1
        label.Text = text
        label.TextColor3 = GLASS.TextPrimary
        label.TextSize = 12
        label.Font = Enum.Font.Gotham
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = frame

        local selectedBtn = Instance.new("TextButton")
        selectedBtn.Size = UDim2.new(0.42, 0, 0, 26)
        selectedBtn.Position = UDim2.new(0.55, 0, 0, 6)
        selectedBtn.BackgroundColor3 = GLASS.SliderTrack
        selectedBtn.Text = default .. " ▾"
        selectedBtn.TextColor3 = GLASS.AccentPrimary
        selectedBtn.TextSize = 12
        selectedBtn.Font = Enum.Font.Gotham
        selectedBtn.AutoButtonColor = false
        selectedBtn.Parent = frame
        Instance.new("UICorner", selectedBtn).CornerRadius = CORNER

        local currentValue = default
        local isOpen = false

        local optionsFrame = Instance.new("Frame")
        optionsFrame.Size = UDim2.new(0.42, 0, 0, #options * 26 + 4)
        optionsFrame.Position = UDim2.new(0.55, 0, 0, 35)
        optionsFrame.BackgroundColor3 = GLASS.PanelBG
        optionsFrame.BackgroundTransparency = 0.05
        optionsFrame.BorderSizePixel = 0
        optionsFrame.Visible = false
        optionsFrame.ZIndex = 5
        optionsFrame.Parent = frame
        Instance.new("UICorner", optionsFrame).CornerRadius = CORNER

        local optStroke = Instance.new("UIStroke")
        optStroke.Color = GLASS.GlassShadow
        optStroke.Thickness = 1
        optStroke.Transparency = 0.5
        optStroke.Parent = optionsFrame

        for j, opt in ipairs(options) do
            local optBtn = Instance.new("TextButton")
            optBtn.Size = UDim2.new(1, 0, 0, 26)
            optBtn.Position = UDim2.new(0, 0, 0, (j - 1) * 26)
            optBtn.BackgroundColor3 = GLASS.PanelBG
            optBtn.BackgroundTransparency = 0.1
            optBtn.Text = opt
            optBtn.TextColor3 = GLASS.TextSecondary
            optBtn.TextSize = 12
            optBtn.Font = Enum.Font.Gotham
            optBtn.AutoButtonColor = false
            optBtn.ZIndex = 6
            optBtn.Parent = optionsFrame

            optBtn.MouseEnter:Connect(function()
                optBtn.BackgroundColor3 = GLASS.AccentSecondary
                optBtn.BackgroundTransparency = 0.3
                optBtn.TextColor3 = GLASS.AccentPrimary
            end)
            optBtn.MouseLeave:Connect(function()
                optBtn.BackgroundColor3 = GLASS.PanelBG
                optBtn.BackgroundTransparency = 0.1
                optBtn.TextColor3 = GLASS.TextSecondary
            end)

            optBtn.MouseButton1Click:Connect(function()
                currentValue = opt
                selectedBtn.Text = opt .. " ▾"
                optionsFrame.Visible = false
                isOpen = false
                frame.ZIndex = 1
                frame.Size = UDim2.new(1, 0, 0, 38)
                if callback then callback(opt) end
            end)
        end

        selectedBtn.MouseButton1Click:Connect(function()
            isOpen = not isOpen
            optionsFrame.Visible = isOpen
            frame.ZIndex = isOpen and 10 or 1
            if isOpen then
                frame.Size = UDim2.new(1, 0, 0, 38 + #options * 26 + 4)
            else
                frame.Size = UDim2.new(1, 0, 0, 38)
            end
        end)

        return {Set = function(val)
            currentValue = val
            selectedBtn.Text = val .. " ▾"
            if callback then callback(val) end
        end}
    end

    -- ============================================================
    -- UI HELPER: Info Label
    -- ============================================================
    local function addLabel(parent, text, order)
        local lbl = Instance.new("TextLabel")
        lbl.Size = UDim2.new(1, 0, 0, 22)
        lbl.BackgroundTransparency = 1
        lbl.Text = text
        lbl.TextColor3 = GLASS.TextSecondary
        lbl.TextSize = 11
        lbl.Font = Enum.Font.Gotham
        lbl.TextWrapped = true
        lbl.LayoutOrder = order
        lbl.Parent = parent
        return lbl
    end

    -- ============================================================
    -- TAB: ESP
    -- ============================================================
    local espTab = tabs["ESP"]
    UIToggles = {}
    addSectionHeader(espTab, "👁 HIỂN THỊ", 1)
    UIToggles.ESP = addToggle(espTab, "Bật ESP", false, 2, function(v) Config.ESPEnabled = v end)
    addToggle(espTab, "Hiện Khung (Box)", true, 3, function(v) Config.ESPBox = v end)
    addDropdown(espTab, "Kiểu Khung", {"Góc (Corner)", "Kín (Full)"}, "Góc (Corner)", 4, function(v)
        if v == "Góc (Corner)" then Config.ESPBoxType = "corners"
        else Config.ESPBoxType = "full" end
    end)
    addSlider(espTab, "Kích Thước Góc", 4, 20, 10, 5, function(v) Config.ESPCornerSize = v end)
    addToggle(espTab, "Hiện Tên", true, 6, function(v) Config.ESPName = v end)
    addToggle(espTab, "Hiện Khoảng Cách", true, 7, function(v) Config.ESPDistance = v end)
    addToggle(espTab, "Hiện Máu", true, 8, function(v) Config.ESPHealth = v end)
    addDropdown(espTab, "Vị Trí Thanh Máu", {"Phải", "Trái"}, "Phải", 9, function(v)
        if v == "Phải" then Config.ESPHealthBarSide = "right"
        else Config.ESPHealthBarSide = "left" end
    end)
    addToggle(espTab, "Hiện Chấm Đầu (Head Dot)", true, 10, function(v) Config.ESPHeadDot = v end)
    addToggle(espTab, "Hiện Đường Kẻ (Tracer)", true, 11, function(v) Config.ESPTracer = v end)
    addToggle(espTab, "Kiểm Tra Đồng Đội", false, 12, function(v) Config.ESPTeamCheck = v end)
    addLabel(espTab, "💡 Khi bật Kiểm Tra Đồng Đội: team hiện màu xanh dương", 12.5)
    addToggle(espTab, "Mờ Dần Theo Khoảng Cách", true, 13, function(v) Config.ESPFadeByDistance = v end)
    addToggle(espTab, "Hiện Vũ Khí (Weapon)", true, 14, function(v) Config.ESPWeapon = v end)

    addSectionHeader(espTab, "🦴 XƯƠNG (Skeleton)", 20)
    addToggle(espTab, "Bật Skeleton", false, 21, function(v) Config.SkeletonEnabled = v end)
    addSlider(espTab, "Độ Dày Skeleton", 1, 5, 2, 22, function(v) Config.SkeletonThickness = v end)

    addSectionHeader(espTab, "📏 KHOẢNG CÁCH", 30)
    addSlider(espTab, "Tầm ESP Tối Đa", 100, 5000, 1000, 31, function(v) Config.ESPMaxDistance = v end)
    addLabel(espTab, "💡 Corner Box: khung 4 góc đẹp & gọn | Chấm đầu dễ thấy vị trí", 32)

    -- ============================================================
    -- TAB: AIMBOT
    -- ============================================================
    local aimTab = tabs["Aimbot"]
    addSectionHeader(aimTab, "🎯 CƠ BẢN", 1)
    UIToggles.Aimbot = addToggle(aimTab, "Bật Aimbot", false, 2, function(v) Config.AimbotEnabled = v end)
    addToggle(aimTab, "Chỉ Khi Bắn", false, 3, function(v) Config.AimbotOnFire = v end)
    addToggle(aimTab, "Bỏ Qua Đồng Đội", false, 4, function(v) Config.AimbotTeamCheck = v end)

    addSectionHeader(aimTab, "📍 MỤC TIÊU", 10)
    addDropdown(aimTab, "Aim Vào", {"Head", "HumanoidRootPart", "UpperTorso"}, "Head", 11, function(v) Config.AimbotTarget = v end)
    addDropdown(aimTab, "Ưu Tiên Mục Tiêu", {"Gần nhất", "Máu thấp nhất"}, "Gần nhất", 12, function(v)
        if v == "Gần nhất" then Config.AimbotPriority = "closest"
        else Config.AimbotPriority = "lowest_hp" end
    end)
    addLabel(aimTab, "💡 Gần nhất = địch gần nhất | Máu thấp nhất = dễ kill hơn", 13)
    addSlider(aimTab, "Vòng FOV", 50, 800, 200, 14, function(v) Config.AimbotFOV = v end)
    addToggle(aimTab, "Hiện Vòng FOV", false, 15, function(v) Config.AimbotShowFOV = v end)

    addSectionHeader(aimTab, "🎯 CHÍNH XÁC", 20)
    addSlider(aimTab, "Mượt (Smooth)", 1, 20, 1, 21, function(v) Config.AimbotSmooth = v end)

    addSectionHeader(aimTab, "⚡ THÔNG MINH", 25)
    addToggle(aimTab, "Giữ Target (Sticky)", true, 26, function(v) Config.AimbotStickyTarget = v end)
    addSlider(aimTab, "Ngưỡng Đổi Target", 10, 20, 13, 27, function(v)
        Config.AimbotStickyThreshold = v / 10
    end)
    addLabel(aimTab, "💡 Giữ target cố định, chỉ đổi khi target mới tốt hơn nhiều", 28)
    addToggle(aimTab, "Dynamic FOV", false, 29, function(v) Config.AimbotDynamicFOV = v end)
    addSlider(aimTab, "FOV Tối Thiểu", 30, 300, 100, 30, function(v) Config.AimbotDynamicFOVMin = v end)
    addSlider(aimTab, "FOV Tối Đa", 200, 800, 400, 31, function(v) Config.AimbotDynamicFOVMax = v end)
    addSlider(aimTab, "Tầm Tham Chiếu", 50, 500, 150, 32, function(v) Config.AimbotDynamicFOVDist = v end)
    addLabel(aimTab, "💡 Gần = FOV rộng | Xa = FOV hẹp | Tự động theo khoảng cách", 33)

    addSectionHeader(aimTab, "🔫 WALLBANG", 40)
    addToggle(aimTab, "Aim Xuyên Tường", false, 41, function(v) Config.AimbotWallbang = v end)
    UIToggles.Wallbang = addToggle(aimTab, "Bắn Xuyên Vật Thể", false, 42, function(v)
        Config.WallbangEnabled = v
        if v then enableWallbang() else disableWallbang() end
    end)
    addLabel(aimTab, "💡 Bật 'Bắn Xuyên Vật Thể' = đạn xuyên tường, chỉ dừng ở player", 43)

    -- ============================================================
    -- TAB: COMBAT (Silent Aim + TriggerBot + Chams)
    -- ============================================================
    local combatTab = tabs["Combat"]
    addSectionHeader(combatTab, "🤫 SILENT AIM", 1)
    UIToggles.SilentAim = addToggle(combatTab, "Bật Silent Aim", false, 2, function(v)
        Config.SilentAimEnabled = v
        if v then enableSilentAim() else disableSilentAim() end
    end)
    addDropdown(combatTab, "Mục Tiêu Silent Aim", {"Head", "HumanoidRootPart", "UpperTorso"}, "Head", 3, function(v) Config.SilentAimTarget = v end)
    addSlider(combatTab, "FOV Silent Aim", 50, 800, 200, 4, function(v) Config.SilentAimFOV = v end)
    addToggle(combatTab, "Hiện Vòng FOV Silent Aim", false, 5, function(v) Config.SilentAimShowFOV = v end)
    addToggle(combatTab, "Dự Đoán Vận Tốc", true, 6, function(v) Config.SilentAimPrediction = v end)
    addToggle(combatTab, "Bỏ Qua Đồng Đội (Silent)", false, 7, function(v) Config.SilentAimTeamCheck = v end)
    addLabel(combatTab, "💡 Silent Aim: sửa trajectory đạn, không move camera", 8)

    addSectionHeader(combatTab, "⚡ TRIGGERBOT", 20)
    UIToggles.TriggerBot = addToggle(combatTab, "Bật TriggerBot", false, 21, function(v) Config.TriggerBotEnabled = v end)
    addToggle(combatTab, "Bỏ Qua Đồng Đội (Trigger)", false, 22, function(v) Config.TriggerBotTeamCheck = v end)
    addSlider(combatTab, "Độ Trễ Bắn (giây)", 0, 200, 0, 23, function(v) Config.TriggerBotDelay = v / 100 end)
    addLabel(combatTab, "💡 Crosshair chạm player → tự động bắn", 24)

    addSectionHeader(combatTab, "🌈 CHAMS", 30)
    UIToggles.Chams = addToggle(combatTab, "Bật Chams", false, 31, function(v) Config.ChamsEnabled = v end)
    addToggle(combatTab, "Bỏ Qua Đồng Đội (Chams)", false, 32, function(v) Config.ChamsTeamCheck = v end)
    addSlider(combatTab, "Độ Trong Suốt Fill", 0, 100, 50, 33, function(v) Config.ChamsFillTransparency = v / 100 end)
    addLabel(combatTab, "💡 Highlight player qua tường bằng AlwaysOnTop", 34)

    -- ============================================================
    -- TAB: HITBOX
    -- ============================================================
    local hitTab = tabs["Hitbox"]
    addSectionHeader(hitTab, "📦 PHÓNG ĐẠI HITBOX", 1)
    addToggle(hitTab, "Bật Phóng Đại", false, 2, function(v) Config.HitboxEnabled = v end)
    addSlider(hitTab, "Kích Thước Body", 5, 50, 10, 3, function(v) Config.HitboxSize = v end)

    addSectionHeader(hitTab, "🟡 PHÓNG ĐẠI ĐẦU", 10)
    addToggle(hitTab, "Bật Phóng Đại Đầu", false, 11, function(v) Config.HeadHitboxEnabled = v end)
    addSlider(hitTab, "Kích Thước Đầu", 5, 50, 10, 12, function(v) Config.HeadHitboxSize = v end)
    addLabel(hitTab, "💡 Phóng đại đầu = dễ headshot hơn", 13)

    -- ============================================================
    -- TAB: PLAYER
    -- ============================================================
    local playerTab = tabs["Player"]
    addSectionHeader(playerTab, "🏃 TỐC ĐỘ", 1)
    addToggle(playerTab, "Bật Tăng Tốc", false, 2, function(v)
        Config.SpeedEnabled = v
        applySpeed()
    end)
    addSlider(playerTab, "Tốc Độ", 16, 200, 50, 3, function(v)
        Config.SpeedValue = v
        if Config.SpeedEnabled then applySpeed() end
    end)

    addSectionHeader(playerTab, "🦘 NHẢY CAO", 10)
    addToggle(playerTab, "Bật Nhảy Cao", false, 11, function(v)
        Config.JumpEnabled = v
        applyJump()
    end)
    addSlider(playerTab, "Lực Nhảy", 50, 500, 150, 12, function(v)
        Config.JumpValue = v
        if Config.JumpEnabled then applyJump() end
    end)

    addSectionHeader(playerTab, "👻 XUYÊN TƯỜNG (Noclip)", 20)
    UIToggles.Noclip = addToggle(playerTab, "Bật Noclip", false, 21, function(v)
        Config.NoclipEnabled = v
        if v then enableNoclip() else disableNoclip() end
    end)

    addSectionHeader(playerTab, "🦿 NHẢY VÔ HẠN", 30)
    UIToggles.InfiniteJump = addToggle(playerTab, "Bật Nhảy Vô Hạn", false, 31, function(v)
        Config.InfiniteJumpEnabled = v
        if v then enableInfiniteJump() else disableInfiniteJump() end
    end)
    addLabel(playerTab, "💡 Nhảy giữa không trung, giữ Space để bay lên", 32)

    addSectionHeader(playerTab, "🛡 ANTI-AFK", 40)
    addToggle(playerTab, "Bật Anti-AFK", false, 41, function(v)
        Config.AntiAFKEnabled = v
        if v then enableAntiAFK() else disableAntiAFK() end
    end)
    addLabel(playerTab, "💡 Chống bị kick khi AFK", 42)

    -- ============================================================
    -- TAB: MISC
    -- ============================================================
    local miscTab = tabs["Misc"]
    addSectionHeader(miscTab, "⚙ CÀI ĐẶT", 1)

    local resetBtn = Instance.new("TextButton")
    resetBtn.Size = UDim2.new(1, 0, 0, 48)
    resetBtn.BackgroundColor3 = GLASS.Danger
    resetBtn.Text = "🔄 RESET TẤT CẢ"
    resetBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    resetBtn.TextSize = 14
    resetBtn.Font = Enum.Font.GothamBold
    resetBtn.LayoutOrder = 2
    resetBtn.AutoButtonColor = false
    resetBtn.Parent = miscTab
    Instance.new("UICorner", resetBtn).CornerRadius = CORNER

    addSectionHeader(miscTab, "⌨ PHÍM TẮT", 3)
    addLabel(miscTab, "Insert: Bật/Tắt Menu", 4)
    addLabel(miscTab, "F1: ESP | F2: Aimbot | F3: Silent Aim", 5)
    addLabel(miscTab, "F4: TriggerBot | F5: Wallbang", 6)
    addLabel(miscTab, "F6: Chams | F7: Noclip | F8: Infinite Jump", 7)

    addSectionHeader(miscTab, "📋 THÔNG TIN", 10)
    addLabel(miscTab, "Hoàng Anh Hub v22 — Clean Glass UI", 11)
    addLabel(miscTab, "ESP | Aimbot | Silent Aim | TriggerBot", 12)
    addLabel(miscTab, "Chams | Wallbang | Hitbox | Player", 13)
    addLabel(miscTab, "⚡ Aim: Gần nhất hoặc Máu thấp nhất", 14)
    addLabel(miscTab, "🤫 Silent Aim: sửa trajectory đạn", 15)

    resetBtn.MouseButton1Click:Connect(function()
        Config.ESPEnabled = false
        Config.SkeletonEnabled = false
        Config.AimbotEnabled = false
        Config.AimbotWallbang = false
        Config.WallbangEnabled = false
        Config.HitboxEnabled = false
        Config.HeadHitboxEnabled = false
        Config.SpeedEnabled = false
        Config.JumpEnabled = false
        Config.NoclipEnabled = false
        Config.SilentAimEnabled = false
        Config.TriggerBotEnabled = false
        Config.ChamsEnabled = false
        Config.InfiniteJumpEnabled = false
        Config.AntiAFKEnabled = false
        Config.AimbotStickyTarget = true
        Config.AimbotStickyThreshold = 1.3
        Config.AimbotDynamicFOV = false
        Config.AimbotDynamicFOVMin = 100
        Config.AimbotDynamicFOVMax = 400
        Config.AimbotDynamicFOVDist = 150
        Config.ESPWeapon = true
        CurrentAimbotTarget = nil
        applySpeed()
        applyJump()
        disableNoclip()
        disableWallbang()
        disableSilentAim()
        disableInfiniteJump()
        disableAntiAFK()
        for player, _ in pairs(ChamsObjects) do
            removeChams(player)
        end
    end)

    -- ============================================================
    -- FLOATING TOGGLE BUTTON
    -- ============================================================
    local btnSize = isMobile and 60 or 50
    local toggleBtn = Instance.new("TextButton")
    toggleBtn.Name = "ToggleBtn"
    toggleBtn.Size = UDim2.new(0, btnSize, 0, btnSize)
    toggleBtn.Position = UDim2.new(0, 20, 0.5, -btnSize / 2)
    toggleBtn.BackgroundColor3 = GLASS.PanelBG
    toggleBtn.BackgroundTransparency = 0.3
    toggleBtn.Text = "⚡"
    toggleBtn.TextColor3 = GLASS.AccentPrimary
    toggleBtn.TextSize = isMobile and 26 or 22
    toggleBtn.Font = Enum.Font.GothamBold
    toggleBtn.AutoButtonColor = false
    toggleBtn.Parent = gui
    Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(1, 0)

    -- White edge stroke
    local tbStroke1 = Instance.new("UIStroke")
    tbStroke1.Color = GLASS.GlassEdge
    tbStroke1.Thickness = 1.5
    tbStroke1.Transparency = 0.15
    tbStroke1.Parent = toggleBtn

    -- Pulsing accent glow
    local tbStroke2 = Instance.new("UIStroke")
    tbStroke2.Color = GLASS.AccentPrimary
    tbStroke2.Thickness = 4
    tbStroke2.Transparency = 0.55
    tbStroke2.Parent = toggleBtn
    TweenService:Create(tbStroke2, TWEEN_GLOW, {Transparency = 0.25}):Play()

    toggleBtn.MouseButton1Click:Connect(function()
        if mainFrame.Visible then
            hideMenu()
        else
            showMenu()
        end
    end)

    -- ============================================================
    -- DRAG: Floating Toggle Button
    -- ============================================================
    local dragToggle = false
    local dragStartToggle, startPosToggle

    local toggleInputBegan = toggleBtn.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragToggle = true
            dragStartToggle = input.Position
            startPosToggle = toggleBtn.Position
        end
    end)
    table.insert(Connections, toggleInputBegan)

    local toggleDragChanged = UserInputService.InputChanged:Connect(function(input)
        if dragToggle and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
            local delta = input.Position - dragStartToggle
            toggleBtn.Position = UDim2.new(
                startPosToggle.X.Scale, startPosToggle.X.Offset + delta.X,
                startPosToggle.Y.Scale, startPosToggle.Y.Offset + delta.Y
            )
        end
    end)
    table.insert(Connections, toggleDragChanged)

    local toggleDragEnded = UserInputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragToggle = false
        end
    end)
    table.insert(Connections, toggleDragEnded)

    -- ============================================================
    -- DRAG: Main Frame (via title bar + anywhere on mobile)
    -- ============================================================
    local dragMain = false
    local dragStartMain, startPosMain

    local mainInputBegan = titleBar.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragMain = true
            dragStartMain = input.Position
            startPosMain = mainFrame.Position
        end
    end)
    table.insert(Connections, mainInputBegan)

    -- On mobile, also allow drag from anywhere on the frame
    if isMobile then
        local mobileDragConn = mainFrame.InputBegan:Connect(function(input)
            if input.UserInputType == Enum.UserInputType.Touch and not dragMain then
                dragMain = true
                dragStartMain = input.Position
                startPosMain = mainFrame.Position
            end
        end)
        table.insert(Connections, mobileDragConn)
    end

    local mainDragChanged = UserInputService.InputChanged:Connect(function(input)
        if dragMain and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
            local delta = input.Position - dragStartMain
            mainFrame.Position = UDim2.new(
                startPosMain.X.Scale, startPosMain.X.Offset + delta.X,
                startPosMain.Y.Scale, startPosMain.Y.Offset + delta.Y
            )
        end
    end)
    table.insert(Connections, mainDragChanged)

    local mainDragEnded = UserInputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragMain = false
        end
    end)
    table.insert(Connections, mainDragEnded)

    -- ============================================================
    -- Close / Minimize buttons
    -- ============================================================
    closeBtn.MouseButton1Click:Connect(function()
        gui:Destroy()
        if _G.HOANG_ANH_HUB and _G.HOANG_ANH_HUB.Cleanup then
            _G.HOANG_ANH_HUB.Cleanup()
        end
    end)

    minBtn.MouseButton1Click:Connect(function()
        hideMenu()
    end)

    return gui
end
-- ============================================================
-- KEYBIND SYSTEM
-- ============================================================
local KeybindConnection = UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    if input.UserInputType ~= Enum.UserInputType.Keyboard then return end

    local key = input.KeyCode
    local kb = Config.Keybinds

    if key == kb.ToggleMenu then
        local gui = LocalPlayer.PlayerGui:FindFirstChild("HoangAnhHub")
        if gui then
            local main = gui:FindFirstChild("MainFrame")
            if main then
                main.Visible = not main.Visible
            end
        end
    elseif key == kb.ToggleESP then
        Config.ESPEnabled = not Config.ESPEnabled
        if UIToggles.ESP then UIToggles.ESP.Set(Config.ESPEnabled) end
    elseif key == kb.ToggleAimbot then
        Config.AimbotEnabled = not Config.AimbotEnabled
        if UIToggles.Aimbot then UIToggles.Aimbot.Set(Config.AimbotEnabled) end
    elseif key == kb.ToggleSilentAim then
        Config.SilentAimEnabled = not Config.SilentAimEnabled
        if Config.SilentAimEnabled then enableSilentAim() else disableSilentAim() end
        if UIToggles.SilentAim then UIToggles.SilentAim.Set(Config.SilentAimEnabled) end
    elseif key == kb.ToggleTriggerBot then
        Config.TriggerBotEnabled = not Config.TriggerBotEnabled
        if UIToggles.TriggerBot then UIToggles.TriggerBot.Set(Config.TriggerBotEnabled) end
    elseif key == kb.ToggleWallbang then
        Config.WallbangEnabled = not Config.WallbangEnabled
        if Config.WallbangEnabled then enableWallbang() else disableWallbang() end
        if UIToggles.Wallbang then UIToggles.Wallbang.Set(Config.WallbangEnabled) end
    elseif key == kb.ToggleChams then
        Config.ChamsEnabled = not Config.ChamsEnabled
        if UIToggles.Chams then UIToggles.Chams.Set(Config.ChamsEnabled) end
    elseif key == kb.ToggleNoclip then
        Config.NoclipEnabled = not Config.NoclipEnabled
        if Config.NoclipEnabled then enableNoclip() else disableNoclip() end
        if UIToggles.Noclip then UIToggles.Noclip.Set(Config.NoclipEnabled) end
    elseif key == kb.ToggleInfiniteJump then
        Config.InfiniteJumpEnabled = not Config.InfiniteJumpEnabled
        if Config.InfiniteJumpEnabled then enableInfiniteJump() else disableInfiniteJump() end
        if UIToggles.InfiniteJump then UIToggles.InfiniteJump.Set(Config.InfiniteJumpEnabled) end
    end
end)
table.insert(Connections, KeybindConnection)

-- ============================================================
-- MAIN LOOP
-- ============================================================
local mainConnection = RunService.RenderStepped:Connect(function()
    Camera = workspace.CurrentCamera
    if not Camera then return end

    -- ESP
    for _, player in ipairs(Players:GetPlayers()) do
        if player ~= LocalPlayer then
            if not ESPObjects[player] then createESP(player) end
            updateESP(player)
            if not SkeletonObjects[player] then createSkeleton(player) end
            updateSkeleton(player)
        end
    end

    -- Aimbot
    doAimbot()

    -- Silent Aim FOV Circle
    updateSilentAimFOVCircle()

    -- TriggerBot
    doTriggerBot()

    -- Chams
    for _, player in ipairs(Players:GetPlayers()) do
        if player ~= LocalPlayer then
            updateChams(player)
        end
    end

    -- FOV Circle
    updateFOVCircle()

    -- Hitbox
    if Config.HitboxEnabled or Config.HeadHitboxEnabled then
        updateHitboxes()
    end
end)

table.insert(Connections, mainConnection)

-- Player join/leave
local joinConn = Players.PlayerAdded:Connect(function(player)
    createESP(player)
    createSkeleton(player)
    if Config.ChamsEnabled then createChams(player) end
end)
table.insert(Connections, joinConn)

local leaveConn = Players.PlayerRemoving:Connect(function(player)
    removeESP(player)
    removeSkeleton(player)
    removeChams(player)
    originalSizes[player] = nil
    originalColors[player] = nil
    originalMaterials[player] = nil
end)
table.insert(Connections, leaveConn)

-- Handle respawn for speed/jump
local respawnConn = LocalPlayer.CharacterAdded:Connect(function(char)
    task.wait(1)
    applySpeed()
    applyJump()
    if Config.NoclipEnabled then
        disableNoclip()
        enableNoclip()
    end
end)
table.insert(Connections, respawnConn)

-- Create UI
createUI()
createFOVCircle()
createSilentAimFOVCircle()

-- ============================================================
-- CLEANUP FUNCTION
-- ============================================================
_G.HOANG_ANH_HUB = {
    Cleanup = function()
        for _, conn in ipairs(Connections) do
            safeDisconnect(conn)
        end
        Connections = {}

        for player, _ in pairs(ESPObjects) do
            removeESP(player)
        end
        for player, _ in pairs(SkeletonObjects) do
            removeSkeleton(player)
        end
        for player, _ in pairs(ChamsObjects) do
            removeChams(player)
        end

        disableNoclip()
        disableWallbang()
        disableSilentAim()
        disableInfiniteJump()
        disableAntiAFK()

        if FOVCircle then
            FOVCircle:Remove()
            FOVCircle = nil
        end

        if SilentAimFOVCircle then
            SilentAimFOVCircle:Remove()
            SilentAimFOVCircle = nil
        end

        local gui = LocalPlayer.PlayerGui:FindFirstChild("HoangAnhHub")
        if gui then gui:Destroy() end

        _G.HOANG_ANH_HUB = nil
    end
}

print("Hoàng Anh Hub v21.3 loaded! ESP (Corner Box/Name/Distance/HP/Head Dot/Tracer) + Aimbot + Silent Aim + TriggerBot + Chams + Wallbang + Hitbox + Player + Infinite Jump + Anti-AFK + Keybinds — Left Sidebar UI")
