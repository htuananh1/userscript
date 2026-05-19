-- Hoàng Anh Hub v21.0
-- Features: ESP (Box/Name/HP/Tracer/Skeleton), Aimbot (Gần nhất/Máu thấp nhất),
-- Silent Aim, TriggerBot, Chams, Wallbang (Xuyên vật thể), Hitbox, Player Mods,
-- Speed, Jump, Noclip, Infinite Jump, Anti-AFK, Keybind System
-- Mobile UI, Topmost, Sidebar Navigation
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
    ESPName = true,
    ESPHealth = true,
    ESPTracer = true,
    ESPTeamCheck = false,
    ESPColor = Color3.fromRGB(0, 255, 100),
    ESPMaxDistance = 1000,

    -- Skeleton
    SkeletonEnabled = false,
    SkeletonColor = Color3.fromRGB(0, 255, 255),
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
local isMobile = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
local ChamsObjects = {}
local TriggerBotConnection = nil
local AntiAFKConnection = nil
local LastTriggerTime = 0

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

            if Config.WallbangEnabled then
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

    WallbangHook = true
end

local function disableWallbang()
    WallbangHook = nil
end

-- ============================================================
-- SILENT AIM SYSTEM
-- ============================================================
local SilentAimHook = nil
local originalFireServer = nil

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
                    local hum = getHumanoid(player)
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
                    vim:SendMouseButtonEvent(0, 0, 0, true, game, 1)
                    task.wait()
                    vim:SendMouseButtonEvent(0, 0, 0, false, game, 1)
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

    -- Box (4 lines)
    local boxLines = {}
    for i = 1, 4 do
        local line = Drawing and Drawing.new("Line")
        if line then
            line.Visible = false
            line.Color = Config.ESPColor
            line.Thickness = 1.5
            line.Transparency = 1
        end
        table.insert(boxLines, line)
    end
    espData.BoxLines = boxLines

    -- Name
    local nameText = Drawing and Drawing.new("Text")
    if nameText then
        nameText.Visible = false
        nameText.Color = Color3.fromRGB(255, 255, 255)
        nameText.Size = 14
        nameText.Center = true
        nameText.Outline = true
        nameText.OutlineColor = Color3.fromRGB(0, 0, 0)
    end
    espData.Name = nameText

    -- Health bar background
    local hpBarBg = Drawing and Drawing.new("Line")
    if hpBarBg then
        hpBarBg.Visible = false
        hpBarBg.Color = Color3.fromRGB(40, 40, 40)
        hpBarBg.Thickness = 4
        hpBarBg.Transparency = 1
    end
    espData.HPBarBg = hpBarBg

    -- Health bar fill
    local hpBarFill = Drawing and Drawing.new("Line")
    if hpBarFill then
        hpBarFill.Visible = false
        hpBarFill.Color = Color3.fromRGB(0, 255, 0)
        hpBarFill.Thickness = 2.5
        hpBarFill.Transparency = 1
    end
    espData.HPBarFill = hpBarFill

    -- Tracer
    local tracer = Drawing and Drawing.new("Line")
    if tracer then
        tracer.Visible = false
        tracer.Color = Config.ESPColor
        tracer.Thickness = 1.2
        tracer.Transparency = 0.7
    end
    espData.Tracer = tracer

    ESPObjects[player] = espData
end

local function removeESP(player)
    local espData = ESPObjects[player]
    if not espData then return end
    pcall(function()
        if espData.BoxLines then
            for _, line in ipairs(espData.BoxLines) do
                if line then line:Remove() end
            end
        end
        if espData.Name then espData.Name:Remove() end
        if espData.HPBarBg then espData.HPBarBg:Remove() end
        if espData.HPBarFill then espData.HPBarFill:Remove() end
        if espData.Tracer then espData.Tracer:Remove() end
    end)
    ESPObjects[player] = nil
end

local function hideESP(espData)
    if espData.BoxLines then
        for _, line in ipairs(espData.BoxLines) do
            if line then line.Visible = false end
        end
    end
    if espData.Name then espData.Name.Visible = false end
    if espData.HPBarBg then espData.HPBarBg.Visible = false end
    if espData.HPBarFill then espData.HPBarFill.Visible = false end
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

    -- Team check
    if Config.ESPTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
        hideESP(espData)
        return
    end

    -- Distance check
    local rootPos = root.Position
    local localRoot = getRootPart(LocalPlayer)
    if localRoot then
        local dist = (rootPos - localRoot.Position).Magnitude
        if dist > Config.ESPMaxDistance then hideESP(espData) return end
    end

    -- Get bounding box
    local head = char:FindFirstChild("Head")
    if not head then hideESP(espData) return end

    local topPos, topOnScreen = getScreenPos(head.Position + Vector3.new(0, 1.5, 0))
    local bottomPos, bottomOnScreen = getScreenPos(rootPos - Vector3.new(0, 3, 0))

    if not topOnScreen and not bottomOnScreen then hideESP(espData) return end

    local boxHeight = math.abs(bottomPos.Y - topPos.Y)
    local boxWidth = boxHeight * 0.55
    local centerX = (topPos.X + bottomPos.X) / 2
    local centerY = (topPos.Y + bottomPos.Y) / 2

    -- Box
    if espData.BoxLines and Config.ESPBox then
        local corners = {
            {Vector2.new(centerX - boxWidth/2, topPos.Y), Vector2.new(centerX + boxWidth/2, topPos.Y)},
            {Vector2.new(centerX + boxWidth/2, topPos.Y), Vector2.new(centerX + boxWidth/2, bottomPos.Y)},
            {Vector2.new(centerX + boxWidth/2, bottomPos.Y), Vector2.new(centerX - boxWidth/2, bottomPos.Y)},
            {Vector2.new(centerX - boxWidth/2, bottomPos.Y), Vector2.new(centerX - boxWidth/2, topPos.Y)},
        }
        for i, line in ipairs(espData.BoxLines) do
            if line then
                line.From = corners[i][1]
                line.To = corners[i][2]
                line.Color = Config.ESPColor
                line.Visible = true
            end
        end
    elseif espData.BoxLines then
        for _, line in ipairs(espData.BoxLines) do
            if line then line.Visible = false end
        end
    end

    -- Name
    if espData.Name then
        if Config.ESPName then
            espData.Name.Text = player.DisplayName or player.Name
            espData.Name.Position = Vector2.new(centerX, topPos.Y - 18)
            espData.Name.Visible = true
        else
            espData.Name.Visible = false
        end
    end

    -- Health bar
    if espData.HPBarBg and espData.HPBarFill and Config.ESPHealth then
        local hpPercent = math.clamp(hum.Health / hum.MaxHealth, 0, 1)
        local barX = centerX - boxWidth/2 - 6
        local barTop = topPos.Y
        local barBottom = bottomPos.Y
        local barHeight = barBottom - barTop

        espData.HPBarBg.From = Vector2.new(barX, barTop)
        espData.HPBarBg.To = Vector2.new(barX, barBottom)
        espData.HPBarBg.Visible = true

        local fillBottom = barBottom
        local fillTop = barBottom - (barHeight * hpPercent)
        espData.HPBarFill.From = Vector2.new(barX, fillTop)
        espData.HPBarFill.To = Vector2.new(barX, fillBottom)

        if hpPercent > 0.6 then
            espData.HPBarFill.Color = Color3.fromRGB(0, 255, 0)
        elseif hpPercent > 0.3 then
            espData.HPBarFill.Color = Color3.fromRGB(255, 255, 0)
        else
            espData.HPBarFill.Color = Color3.fromRGB(255, 0, 0)
        end
        espData.HPBarFill.Visible = true
    else
        if espData.HPBarBg then espData.HPBarBg.Visible = false end
        if espData.HPBarFill then espData.HPBarFill.Visible = false end
    end

    -- Tracer
    if espData.Tracer and Config.ESPTracer then
        local screenBottom = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y)
        espData.Tracer.From = screenBottom
        espData.Tracer.To = Vector2.new(centerX, bottomPos.Y)
        espData.Tracer.Color = Config.ESPColor
        espData.Tracer.Visible = true
    elseif espData.Tracer then
        espData.Tracer.Visible = false
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

    if Config.ESPTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
        hideSkeleton(data)
        return
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
                    line.Color = Config.SkeletonColor
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
local function getAimbotTarget()
    local bestTarget = nil
    local bestValue = math.huge
    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)

    for _, player in ipairs(Players:GetPlayers()) do
        local valid = true

        if player == LocalPlayer then
            valid = false
        end

        if valid and not isAlive(player) then
            valid = false
        end

        -- Team check
        if valid and Config.AimbotTeamCheck and LocalPlayer.Team and player.Team and LocalPlayer.Team == player.Team then
            valid = false
        end

        if valid then
            local char = getCharacter(player)
            local hum = getHumanoid(player)
            local targetPart = nil

            if Config.AimbotTarget == "Head" then
                targetPart = char:FindFirstChild("Head")
            elseif Config.AimbotTarget == "HumanoidRootPart" then
                targetPart = char:FindFirstChild("HumanoidRootPart")
            elseif Config.AimbotTarget == "UpperTorso" then
                targetPart = char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso")
            end

            if targetPart then
                local screenPos, onScreen = getScreenPos(targetPart.Position)
                local fovDist = (screenPos - screenCenter).Magnitude

                if fovDist <= Config.AimbotFOV then
                    -- Visibility check (skip if aimbot wallbang enabled)
                    local canSee = true
                    if not Config.AimbotWallbang then
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
                            if hitPlayer ~= player then
                                canSee = false
                            end
                        end
                    end

                    if canSee then
                        local value = 0
                        if Config.AimbotPriority == "closest" then
                            local localRoot = getRootPart(LocalPlayer)
                            if localRoot then
                                value = (targetPart.Position - localRoot.Position).Magnitude
                            end
                        elseif Config.AimbotPriority == "lowest_hp" then
                            value = hum.Health
                        end

                        if value < bestValue then
                            bestValue = value
                            bestTarget = targetPart
                        end
                    end
                end
            end
        end
    end

    return bestTarget
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
                                if not originalSizes[player][partName] then
                                    originalSizes[player][partName] = part.Size
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
                        if originalSizes[player] then
                            for partName, origSize in pairs(originalSizes[player]) do
                                local part = char:FindFirstChild(partName)
                                if part and part:IsA("BasePart") then
                                    pcall(function()
                                        part.Size = origSize
                                        part.Transparency = 0
                                        part.Material = Enum.Material.Plastic
                                    end)
                                end
                            end
                            originalSizes[player] = nil
                        end
                    end

                    -- Head Hitbox
                    local head = char:FindFirstChild("Head")
                    if head and head:IsA("BasePart") then
                        if Config.HeadHitboxEnabled then
                            if not originalSizes[player] then originalSizes[player] = {} end
                            if not originalSizes[player]["Head"] then
                                originalSizes[player]["Head"] = head.Size
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
                                    head.Material = Enum.Material.Plastic
                                end)
                                originalSizes[player]["Head"] = nil
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
        FOVCircle.Radius = Config.AimbotFOV
        FOVCircle.Visible = true
    else
        FOVCircle.Visible = false
    end
end

-- ============================================================
-- UI SYSTEM
-- ============================================================
local function createUI()
    -- Destroy old UI
    local oldGui = LocalPlayer.PlayerGui:FindFirstChild("HoangAnhHub")
    if oldGui then oldGui:Destroy() end

    local gui = Instance.new("ScreenGui")
    gui.Name = "HoangAnhHub"
    gui.ResetOnSpawn = false
    gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    gui.DisplayOrder = 999999
    pcall(function()
        gui.IgnoreGuiInset = true
    end)
    gui.Parent = LocalPlayer.PlayerGui

    -- Main Frame
    local mainFrame = Instance.new("Frame")
    mainFrame.Name = "MainFrame"
    mainFrame.Size = UDim2.new(0, 320, 0, 480)
    mainFrame.Position = UDim2.new(0.5, -160, 0.5, -240)
    mainFrame.BackgroundColor3 = Color3.fromRGB(18, 18, 24)
    mainFrame.BorderSizePixel = 0
    mainFrame.Visible = false
    mainFrame.Parent = gui

    local mainCorner = Instance.new("UICorner")
    mainCorner.CornerRadius = UDim.new(0, 10)
    mainCorner.Parent = mainFrame

    local mainStroke = Instance.new("UIStroke")
    mainStroke.Color = Color3.fromRGB(0, 200, 100)
    mainStroke.Thickness = 1.5
    mainStroke.Transparency = 0.3
    mainStroke.Parent = mainFrame

    local shadow = Instance.new("ImageLabel")
    shadow.Name = "Shadow"
    shadow.AnchorPoint = Vector2.new(0.5, 0.5)
    shadow.Position = UDim2.new(0.5, 0, 0.5, 4)
    shadow.Size = UDim2.new(1, 30, 1, 30)
    shadow.BackgroundTransparency = 1
    shadow.Image = "rbxassetid://6015897843"
    shadow.ImageColor3 = Color3.new(0, 0, 0)
    shadow.ImageTransparency = 0.5
    shadow.ScaleType = Enum.ScaleType.Slice
    shadow.SliceCenter = Rect.new(49, 49, 450, 450)
    shadow.ZIndex = 0
    shadow.Parent = mainFrame

    -- Title Bar
    local titleBar = Instance.new("Frame")
    titleBar.Name = "TitleBar"
    titleBar.Size = UDim2.new(1, 0, 0, 40)
    titleBar.BackgroundColor3 = Color3.fromRGB(12, 12, 18)
    titleBar.BorderSizePixel = 0
    titleBar.Parent = mainFrame

    local titleCorner = Instance.new("UICorner")
    titleCorner.CornerRadius = UDim.new(0, 10)
    titleCorner.Parent = titleBar

    local titleFix = Instance.new("Frame")
    titleFix.Size = UDim2.new(1, 0, 0, 10)
    titleFix.Position = UDim2.new(0, 0, 1, -10)
    titleFix.BackgroundColor3 = Color3.fromRGB(12, 12, 18)
    titleFix.BorderSizePixel = 0
    titleFix.Parent = titleBar

    local titleLabel = Instance.new("TextLabel")
    titleLabel.Size = UDim2.new(1, -80, 1, 0)
    titleLabel.Position = UDim2.new(0, 15, 0, 0)
    titleLabel.BackgroundTransparency = 1
    titleLabel.Text = "⚡ Hoàng Anh Hub v21.0"
    titleLabel.TextColor3 = Color3.fromRGB(0, 255, 150)
    titleLabel.TextSize = 16
    titleLabel.Font = Enum.Font.GothamBold
    titleLabel.TextXAlignment = Enum.TextXAlignment.Left
    titleLabel.Parent = titleBar

    -- Close Button
    local closeBtn = Instance.new("TextButton")
    closeBtn.Size = UDim2.new(0, 30, 0, 30)
    closeBtn.Position = UDim2.new(1, -35, 0, 5)
    closeBtn.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
    closeBtn.Text = "✕"
    closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    closeBtn.TextSize = 14
    closeBtn.Font = Enum.Font.GothamBold
    closeBtn.Parent = titleBar

    local closeBtnCorner = Instance.new("UICorner")
    closeBtnCorner.CornerRadius = UDim.new(0, 6)
    closeBtnCorner.Parent = closeBtn

    -- Minimize Button
    local minBtn = Instance.new("TextButton")
    minBtn.Size = UDim2.new(0, 30, 0, 30)
    minBtn.Position = UDim2.new(1, -70, 0, 5)
    minBtn.BackgroundColor3 = Color3.fromRGB(60, 60, 70)
    minBtn.Text = "—"
    minBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    minBtn.TextSize = 14
    minBtn.Font = Enum.Font.GothamBold
    minBtn.Parent = titleBar

    local minBtnCorner = Instance.new("UICorner")
    minBtnCorner.CornerRadius = UDim.new(0, 6)
    minBtnCorner.Parent = minBtn

    -- Sidebar
    local sidebar = Instance.new("Frame")
    sidebar.Name = "Sidebar"
    sidebar.Size = UDim2.new(0, 70, 1, -40)
    sidebar.Position = UDim2.new(0, 0, 0, 40)
    sidebar.BackgroundColor3 = Color3.fromRGB(14, 14, 20)
    sidebar.BorderSizePixel = 0
    sidebar.Parent = mainFrame

    local sidebarLayout = Instance.new("UIListLayout")
    sidebarLayout.SortOrder = Enum.SortOrder.LayoutOrder
    sidebarLayout.Padding = UDim.new(0, 4)
    sidebarLayout.Parent = sidebar

    local sidebarPadding = Instance.new("UIPadding")
    sidebarPadding.PaddingTop = UDim.new(0, 8)
    sidebarPadding.PaddingLeft = UDim.new(0, 5)
    sidebarPadding.PaddingRight = UDim.new(0, 5)
    sidebarPadding.Parent = sidebar

    -- Content Area
    local contentArea = Instance.new("Frame")
    contentArea.Name = "ContentArea"
    contentArea.Size = UDim2.new(1, -80, 1, -50)
    contentArea.Position = UDim2.new(0, 80, 0, 45)
    contentArea.BackgroundTransparency = 1
    contentArea.Parent = mainFrame

    -- Tab Content Frames
    local tabs = {}
    local tabNames = {"ESP", "Aimbot", "Combat", "Hitbox", "Player", "Misc"}
    local tabIcons = {"👁", "🎯", "🔫", "📦", "🏃", "⚙"}
    local currentTab = "ESP"

    for i, name in ipairs(tabNames) do
        local tabContent = Instance.new("ScrollingFrame")
        tabContent.Name = name
        tabContent.Size = UDim2.new(1, -10, 1, 0)
        tabContent.Position = UDim2.new(0, 5, 0, 0)
        tabContent.BackgroundTransparency = 1
        tabContent.ScrollBarThickness = 3
        tabContent.ScrollBarImageColor3 = Color3.fromRGB(0, 200, 100)
        tabContent.BorderSizePixel = 0
        tabContent.CanvasSize = UDim2.new(0, 0, 0, 0)
        tabContent.AutomaticCanvasSize = Enum.AutomaticSize.Y
        tabContent.Visible = (name == currentTab)
        tabContent.Parent = contentArea

        local layout = Instance.new("UIListLayout")
        layout.SortOrder = Enum.SortOrder.LayoutOrder
        layout.Padding = UDim.new(0, 6)
        layout.Parent = tabContent

        local padding = Instance.new("UIPadding")
        padding.PaddingTop = UDim.new(0, 5)
        padding.PaddingLeft = UDim.new(0, 5)
        padding.PaddingRight = UDim.new(0, 5)
        padding.Parent = tabContent

        tabs[name] = tabContent

        -- Sidebar button
        local btn = Instance.new("TextButton")
        btn.Name = "Tab_" .. name
        btn.Size = UDim2.new(1, 0, 0, 50)
        btn.BackgroundColor3 = (name == currentTab) and Color3.fromRGB(0, 200, 100) or Color3.fromRGB(22, 22, 30)
        btn.Text = tabIcons[i] .. "\n" .. name
        btn.TextColor3 = Color3.fromRGB(255, 255, 255)
        btn.TextSize = 11
        btn.Font = Enum.Font.GothamBold
        btn.AutoButtonColor = false
        btn.Parent = sidebar

        local btnCorner = Instance.new("UICorner")
        btnCorner.CornerRadius = UDim.new(0, 8)
        btnCorner.Parent = btn

        btn.MouseButton1Click:Connect(function()
            for tabName, frame in pairs(tabs) do
                frame.Visible = (tabName == name)
            end
            for _, sBtn in ipairs(sidebar:GetChildren()) do
                if sBtn:IsA("TextButton") then
                    sBtn.BackgroundColor3 = Color3.fromRGB(22, 22, 30)
                end
            end
            btn.BackgroundColor3 = Color3.fromRGB(0, 200, 100)
            currentTab = name
        end)
    end

    -- ============================================================
    -- UI HELPER FUNCTIONS
    -- ============================================================
    local function addSectionHeader(parent, text, order)
        local header = Instance.new("TextLabel")
        header.Name = "Header_" .. text
        header.Size = UDim2.new(1, 0, 0, 28)
        header.BackgroundColor3 = Color3.fromRGB(0, 180, 90)
        header.BackgroundTransparency = 0.85
        header.Text = "  " .. text
        header.TextColor3 = Color3.fromRGB(0, 255, 150)
        header.TextSize = 13
        header.Font = Enum.Font.GothamBold
        header.TextXAlignment = Enum.TextXAlignment.Left
        header.LayoutOrder = order
        header.Parent = parent

        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 6)
        corner.Parent = header
    end

    local function addToggle(parent, text, default, order, callback)
        local frame = Instance.new("Frame")
        frame.Name = "Toggle_" .. text
        frame.Size = UDim2.new(1, 0, 0, 36)
        frame.BackgroundColor3 = Color3.fromRGB(28, 28, 38)
        frame.BorderSizePixel = 0
        frame.LayoutOrder = order
        frame.Parent = parent

        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 8)
        corner.Parent = frame

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, -60, 1, 0)
        label.Position = UDim2.new(0, 12, 0, 0)
        label.BackgroundTransparency = 1
        label.Text = text
        label.TextColor3 = Color3.fromRGB(220, 220, 220)
        label.TextSize = 13
        label.Font = Enum.Font.Gotham
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = frame

        local toggle = Instance.new("TextButton")
        toggle.Size = UDim2.new(0, 44, 0, 22)
        toggle.Position = UDim2.new(1, -54, 0.5, -11)
        toggle.BackgroundColor3 = default and Color3.fromRGB(0, 200, 100) or Color3.fromRGB(60, 60, 70)
        toggle.Text = ""
        toggle.AutoButtonColor = false
        toggle.Parent = frame

        local toggleCorner = Instance.new("UICorner")
        toggleCorner.CornerRadius = UDim.new(0, 11)
        toggleCorner.Parent = toggle

        local indicator = Instance.new("Frame")
        indicator.Size = UDim2.new(0, 18, 0, 18)
        indicator.Position = default and UDim2.new(1, -20, 0.5, -9) or UDim2.new(0, 2, 0.5, -9)
        indicator.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
        indicator.BorderSizePixel = 0
        indicator.Parent = toggle

        local indicatorCorner = Instance.new("UICorner")
        indicatorCorner.CornerRadius = UDim.new(1, 0)
        indicatorCorner.Parent = indicator

        local state = default
        toggle.MouseButton1Click:Connect(function()
            state = not state
            toggle.BackgroundColor3 = state and Color3.fromRGB(0, 200, 100) or Color3.fromRGB(60, 60, 70)
            indicator.Position = state and UDim2.new(1, -20, 0.5, -9) or UDim2.new(0, 2, 0.5, -9)
            if callback then callback(state) end
        end)

        return {Set = function(val)
            state = val
            toggle.BackgroundColor3 = state and Color3.fromRGB(0, 200, 100) or Color3.fromRGB(60, 60, 70)
            indicator.Position = state and UDim2.new(1, -20, 0.5, -9) or UDim2.new(0, 2, 0.5, -9)
        end}
    end

    local function addSlider(parent, text, min, max, default, order, callback)
        local frame = Instance.new("Frame")
        frame.Name = "Slider_" .. text
        frame.Size = UDim2.new(1, 0, 0, 50)
        frame.BackgroundColor3 = Color3.fromRGB(28, 28, 38)
        frame.BorderSizePixel = 0
        frame.LayoutOrder = order
        frame.Parent = parent

        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 8)
        corner.Parent = frame

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, -80, 0, 20)
        label.Position = UDim2.new(0, 12, 0, 4)
        label.BackgroundTransparency = 1
        label.Text = text .. ": " .. default
        label.TextColor3 = Color3.fromRGB(220, 220, 220)
        label.TextSize = 12
        label.Font = Enum.Font.Gotham
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = frame

        local sliderBg = Instance.new("Frame")
        sliderBg.Size = UDim2.new(1, -24, 0, 8)
        sliderBg.Position = UDim2.new(0, 12, 0, 32)
        sliderBg.BackgroundColor3 = Color3.fromRGB(50, 50, 60)
        sliderBg.BorderSizePixel = 0
        sliderBg.Parent = frame

        local sliderBgCorner = Instance.new("UICorner")
        sliderBgCorner.CornerRadius = UDim.new(0, 4)
        sliderBgCorner.Parent = sliderBg

        local percent = (default - min) / (max - min)
        local sliderFill = Instance.new("Frame")
        sliderFill.Size = UDim2.new(percent, 0, 1, 0)
        sliderFill.BackgroundColor3 = Color3.fromRGB(0, 200, 100)
        sliderFill.BorderSizePixel = 0
        sliderFill.Parent = sliderBg

        local sliderFillCorner = Instance.new("UICorner")
        sliderFillCorner.CornerRadius = UDim.new(0, 4)
        sliderFillCorner.Parent = sliderFill

        local sliderBtn = Instance.new("TextButton")
        sliderBtn.Size = UDim2.new(0, 16, 0, 16)
        sliderBtn.Position = UDim2.new(percent, -8, 0.5, -8)
        sliderBtn.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
        sliderBtn.Text = ""
        sliderBtn.AutoButtonColor = false
        sliderBtn.Parent = sliderBg

        local sliderBtnCorner = Instance.new("UICorner")
        sliderBtnCorner.CornerRadius = UDim.new(1, 0)
        sliderBtnCorner.Parent = sliderBtn

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
                local absPos = sliderBg.AbsolutePosition
                local absSize = sliderBg.AbsoluteSize
                local relX = math.clamp((pos.X - absPos.X) / absSize.X, 0, 1)
                currentValue = math.floor(min + (max - min) * relX + 0.5)
                sliderFill.Size = UDim2.new(relX, 0, 1, 0)
                sliderBtn.Position = UDim2.new(relX, -8, 0.5, -8)
                label.Text = text .. ": " .. currentValue
                if callback then callback(currentValue) end
            end
        end)
        table.insert(Connections, changeConn)

        return {Set = function(val)
            currentValue = val
            local p = (val - min) / (max - min)
            sliderFill.Size = UDim2.new(p, 0, 1, 0)
            sliderBtn.Position = UDim2.new(p, -8, 0.5, -8)
            label.Text = text .. ": " .. val
        end}
    end

    local function addDropdown(parent, text, options, default, order, callback)
        local frame = Instance.new("Frame")
        frame.Name = "Dropdown_" .. text
        frame.Size = UDim2.new(1, 0, 0, 36)
        frame.BackgroundColor3 = Color3.fromRGB(28, 28, 38)
        frame.BorderSizePixel = 0
        frame.LayoutOrder = order
        frame.ClipsDescendants = true
        frame.Parent = parent

        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 8)
        corner.Parent = frame

        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(0.5, 0, 0, 36)
        label.Position = UDim2.new(0, 12, 0, 0)
        label.BackgroundTransparency = 1
        label.Text = text
        label.TextColor3 = Color3.fromRGB(220, 220, 220)
        label.TextSize = 12
        label.Font = Enum.Font.Gotham
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.Parent = frame

        local selectedBtn = Instance.new("TextButton")
        selectedBtn.Size = UDim2.new(0.45, 0, 0, 26)
        selectedBtn.Position = UDim2.new(0.52, 0, 0, 5)
        selectedBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
        selectedBtn.Text = default .. " ▾"
        selectedBtn.TextColor3 = Color3.fromRGB(0, 255, 150)
        selectedBtn.TextSize = 12
        selectedBtn.Font = Enum.Font.Gotham
        selectedBtn.AutoButtonColor = false
        selectedBtn.Parent = frame

        local selectedCorner = Instance.new("UICorner")
        selectedCorner.CornerRadius = UDim.new(0, 6)
        selectedCorner.Parent = selectedBtn

        local currentValue = default
        local isOpen = false

        local optionsFrame = Instance.new("Frame")
        optionsFrame.Size = UDim2.new(0.45, 0, 0, #options * 26)
        optionsFrame.Position = UDim2.new(0.52, 0, 0, 34)
        optionsFrame.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
        optionsFrame.BorderSizePixel = 0
        optionsFrame.Visible = false
        optionsFrame.Parent = frame

        local optCorner = Instance.new("UICorner")
        optCorner.CornerRadius = UDim.new(0, 6)
        optCorner.Parent = optionsFrame

        for j, opt in ipairs(options) do
            local optBtn = Instance.new("TextButton")
            optBtn.Size = UDim2.new(1, 0, 0, 26)
            optBtn.Position = UDim2.new(0, 0, 0, (j-1) * 26)
            optBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
            optBtn.Text = opt
            optBtn.TextColor3 = Color3.fromRGB(200, 200, 200)
            optBtn.TextSize = 12
            optBtn.Font = Enum.Font.Gotham
            optBtn.AutoButtonColor = false
            optBtn.Parent = optionsFrame

            optBtn.MouseButton1Click:Connect(function()
                currentValue = opt
                selectedBtn.Text = opt .. " ▾"
                optionsFrame.Visible = false
                isOpen = false
                frame.Size = UDim2.new(1, 0, 0, 36)
                if callback then callback(opt) end
            end)
        end

        selectedBtn.MouseButton1Click:Connect(function()
            isOpen = not isOpen
            optionsFrame.Visible = isOpen
            if isOpen then
                frame.Size = UDim2.new(1, 0, 0, 36 + #options * 26 + 4)
            else
                frame.Size = UDim2.new(1, 0, 0, 36)
            end
        end)

        return {Set = function(val)
            currentValue = val
            selectedBtn.Text = val .. " ▾"
            if callback then callback(val) end
        end}
    end

    local function addLabel(parent, text, order)
        local label = Instance.new("TextLabel")
        label.Size = UDim2.new(1, 0, 0, 24)
        label.BackgroundTransparency = 1
        label.Text = text
        label.TextColor3 = Color3.fromRGB(160, 160, 170)
        label.TextSize = 11
        label.Font = Enum.Font.Gotham
        label.TextWrapped = true
        label.LayoutOrder = order
        label.Parent = parent
        return label
    end

    -- ============================================================
    -- TAB: ESP
    -- ============================================================
    local espTab = tabs["ESP"]
    addSectionHeader(espTab, "👁 HIỂN THỊ", 1)
    addToggle(espTab, "Bật ESP", false, 2, function(v) Config.ESPEnabled = v end)
    addToggle(espTab, "Hiện Khung (Box)", true, 3, function(v) Config.ESPBox = v end)
    addToggle(espTab, "Hiện Tên", true, 4, function(v) Config.ESPName = v end)
    addToggle(espTab, "Hiện Máu", true, 5, function(v) Config.ESPHealth = v end)
    addToggle(espTab, "Hiện Đường Kẻ (Tracer)", true, 6, function(v) Config.ESPTracer = v end)
    addToggle(espTab, "Kiểm Tra Đồng Đội", false, 7, function(v) Config.ESPTeamCheck = v end)

    addSectionHeader(espTab, "🦴 XƯƠNG (Skeleton)", 10)
    addToggle(espTab, "Bật Skeleton", false, 11, function(v) Config.SkeletonEnabled = v end)
    addSlider(espTab, "Độ Dày Skeleton", 1, 5, 2, 12, function(v) Config.SkeletonThickness = v end)

    addSectionHeader(espTab, "📏 KHOẢNG CÁCH", 20)
    addSlider(espTab, "Tầm ESP Tối Đa", 100, 5000, 1000, 21, function(v) Config.ESPMaxDistance = v end)
    addLabel(espTab, "💡 Bật ESP + Skeleton để thấy cả xương kẻ địch", 22)

    -- ============================================================
    -- TAB: AIMBOT
    -- ============================================================
    local aimTab = tabs["Aimbot"]
    addSectionHeader(aimTab, "🎯 CƠ BẢN", 1)
    addToggle(aimTab, "Bật Aimbot", false, 2, function(v) Config.AimbotEnabled = v end)
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

    addSectionHeader(aimTab, "🔫 WALLBANG", 30)
    addToggle(aimTab, "Aim Xuyên Tường", false, 31, function(v) Config.AimbotWallbang = v end)
    addToggle(aimTab, "Bắn Xuyên Vật Thể", false, 32, function(v)
        Config.WallbangEnabled = v
        if v then enableWallbang() else disableWallbang() end
    end)
    addLabel(aimTab, "💡 Bật 'Bắn Xuyên Vật Thể' = đạn xuyên tường, chỉ dừng ở player", 33)

    -- ============================================================
    -- TAB: COMBAT (Silent Aim + TriggerBot + Chams)
    -- ============================================================
    local combatTab = tabs["Combat"]
    addSectionHeader(combatTab, "🤫 SILENT AIM", 1)
    addToggle(combatTab, "Bật Silent Aim", false, 2, function(v)
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
    addToggle(combatTab, "Bật TriggerBot", false, 21, function(v) Config.TriggerBotEnabled = v end)
    addToggle(combatTab, "Bỏ Qua Đồng Đội (Trigger)", false, 22, function(v) Config.TriggerBotTeamCheck = v end)
    addSlider(combatTab, "Độ Trễ Bắn (giây)", 0, 100, 0, 23, function(v) Config.TriggerBotDelay = v / 100 end)
    addLabel(combatTab, "💡 Crosshair chạm player → tự động bắn", 24)

    addSectionHeader(combatTab, "🌈 CHAMS", 30)
    addToggle(combatTab, "Bật Chams", false, 31, function(v) Config.ChamsEnabled = v end)
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
    addToggle(playerTab, "Bật Noclip", false, 21, function(v)
        Config.NoclipEnabled = v
        if v then enableNoclip() else disableNoclip() end
    end)

    addSectionHeader(playerTab, "🦿 NHẢY VÔ HẠN", 30)
    addToggle(playerTab, "Bật Nhảy Vô Hạn", false, 31, function(v)
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
    addSectionHeader(miscTab, "⚙ KHÁC", 1)

    local resetBtn = Instance.new("TextButton")
    resetBtn.Size = UDim2.new(1, 0, 0, 40)
    resetBtn.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
    resetBtn.Text = "🔄 RESET TẤT CẢ"
    resetBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    resetBtn.TextSize = 14
    resetBtn.Font = Enum.Font.GothamBold
    resetBtn.LayoutOrder = 2
    resetBtn.Parent = miscTab

    local resetCorner = Instance.new("UICorner")
    resetCorner.CornerRadius = UDim.new(0, 8)
    resetCorner.Parent = resetBtn

    addSectionHeader(miscTab, "⌨ PHÍM TẮT", 3)
    addLabel(miscTab, "Insert: Bật/Tắt Menu", 4)
    addLabel(miscTab, "F1: ESP | F2: Aimbot | F3: Silent Aim", 5)
    addLabel(miscTab, "F4: TriggerBot | F5: Wallbang", 6)
    addLabel(miscTab, "F6: Chams | F7: Noclip | F8: Infinite Jump", 7)

    addLabel(miscTab, "Hoàng Anh Hub v21.0", 10)
    addLabel(miscTab, "ESP | Aimbot | Silent Aim | TriggerBot", 11)
    addLabel(miscTab, "Chams | Wallbang | Hitbox | Player", 12)
    addLabel(miscTab, "⚡ Aim: Gần nhất hoặc Máu thấp nhất", 13)
    addLabel(miscTab, "🤫 Silent Aim: sửa trajectory đạn", 14)

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
    -- TOGGLE BUTTON (nút nổi)
    -- ============================================================
    local toggleBtn = Instance.new("TextButton")
    toggleBtn.Name = "ToggleBtn"
    toggleBtn.Size = UDim2.new(0, 50, 0, 50)
    toggleBtn.Position = UDim2.new(0, 20, 0.5, -25)
    toggleBtn.BackgroundColor3 = Color3.fromRGB(0, 200, 100)
    toggleBtn.Text = "⚡"
    toggleBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    toggleBtn.TextSize = 24
    toggleBtn.Font = Enum.Font.GothamBold
    toggleBtn.AutoButtonColor = false
    toggleBtn.Parent = gui

    local toggleCorner2 = Instance.new("UICorner")
    toggleCorner2.CornerRadius = UDim.new(0, 25)
    toggleCorner2.Parent = toggleBtn

    local toggleStroke = Instance.new("UIStroke")
    toggleStroke.Color = Color3.fromRGB(0, 255, 150)
    toggleStroke.Thickness = 2
    toggleStroke.Parent = toggleBtn

    toggleBtn.MouseButton1Click:Connect(function()
        mainFrame.Visible = not mainFrame.Visible
    end)

    -- Drag toggle button (mobile)
    local dragToggle = false
    local dragStartToggle, startPosToggle

    toggleBtn.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragToggle = true
            dragStartToggle = input.Position
            startPosToggle = toggleBtn.Position
        end
    end)

    UserInputService.InputChanged:Connect(function(input)
        if dragToggle and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
            local delta = input.Position - dragStartToggle
            toggleBtn.Position = UDim2.new(
                startPosToggle.X.Scale, startPosToggle.X.Offset + delta.X,
                startPosToggle.Y.Scale, startPosToggle.Y.Offset + delta.Y
            )
        end
    end)

    UserInputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragToggle = false
        end
    end)

    -- Drag main frame
    local dragMain = false
    local dragStartMain, startPosMain

    titleBar.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragMain = true
            dragStartMain = input.Position
            startPosMain = mainFrame.Position
        end
    end)

    UserInputService.InputChanged:Connect(function(input)
        if dragMain and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
            local delta = input.Position - dragStartMain
            mainFrame.Position = UDim2.new(
                startPosMain.X.Scale, startPosMain.X.Offset + delta.X,
                startPosMain.Y.Scale, startPosMain.Y.Offset + delta.Y
            )
        end
    end)

    UserInputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragMain = false
        end
    end)

    -- Close button
    closeBtn.MouseButton1Click:Connect(function()
        gui:Destroy()
        if _G.HOANG_ANH_HUB and _G.HOANG_ANH_HUB.Cleanup then
            _G.HOANG_ANH_HUB.Cleanup()
        end
    end)

    -- Minimize button
    minBtn.MouseButton1Click:Connect(function()
        mainFrame.Visible = false
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
    elseif key == kb.ToggleAimbot then
        Config.AimbotEnabled = not Config.AimbotEnabled
    elseif key == kb.ToggleSilentAim then
        Config.SilentAimEnabled = not Config.SilentAimEnabled
        if Config.SilentAimEnabled then enableSilentAim() else disableSilentAim() end
    elseif key == kb.ToggleTriggerBot then
        Config.TriggerBotEnabled = not Config.TriggerBotEnabled
    elseif key == kb.ToggleWallbang then
        Config.WallbangEnabled = not Config.WallbangEnabled
        if Config.WallbangEnabled then enableWallbang() else disableWallbang() end
    elseif key == kb.ToggleChams then
        Config.ChamsEnabled = not Config.ChamsEnabled
    elseif key == kb.ToggleNoclip then
        Config.NoclipEnabled = not Config.NoclipEnabled
        if Config.NoclipEnabled then enableNoclip() else disableNoclip() end
    elseif key == kb.ToggleInfiniteJump then
        Config.InfiniteJumpEnabled = not Config.InfiniteJumpEnabled
        if Config.InfiniteJumpEnabled then enableInfiniteJump() else disableInfiniteJump() end
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
end)
table.insert(Connections, leaveConn)

-- Handle respawn for speed/jump
local respawnConn = LocalPlayer.CharacterAdded:Connect(function(char)
    task.wait(1)
    applySpeed()
    applyJump()
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

print("Hoàng Anh Hub v21.0 loaded! ESP + Aimbot + Silent Aim + TriggerBot + Chams + Wallbang + Hitbox + Player + Infinite Jump + Anti-AFK + Keybinds")
