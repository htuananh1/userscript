     1|--[[
     2|    ╔══════════════════════════════════════════════╗
     3|    ║         Hoàng Anh Hub v11 — FULL CODE        ║
     4|    ║  ESP Box + Name + HP Text + Skeleton + Tracer ║
     5|    ║  Aimbot + FOV + Prediction + WallCheck        ║
     6|    ║  Hitbox + Speed + InfJump                     ║
     7|    ╚══════════════════════════════════════════════╝
     8|    
     9|    Menu: 4 tab (ESP | AIM | PLAYER | MISC)
    10|    Toggle: nút HA hoặc RightShift
    11|]]
    12|
    13|-- ═══════════════════════════════════════════════════════
    14|-- SERVICES
    15|-- ═══════════════════════════════════════════════════════
    16|local Players = game:GetService("Players")
    17|local RunService = game:GetService("RunService")
    18|local UserInputService = game:GetService("UserInputService")
    19|local LocalPlayer = Players.LocalPlayer
    20|local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
    21|local Camera = workspace.CurrentCamera
    22|
    23|-- ═══════════════════════════════════════════════════════
    24|-- CONFIG
    25|-- ═══════════════════════════════════════════════════════
    26|local CFG = {
    27|    HubName = "Hoàng Anh",
    28|    Version = "v11",
    29|
    30|    -- ESP
    31|    EspEnabled = false,
    32|    EspBox = true,
    33|    EspName = true,
    34|    EspHP = true,
    35|    EspHPText = true,        -- Hiển thị số máu "75/100"
    36|    EspSkeleton = true,       -- NEW: Khung xương
    37|    EspMeters = true,
    38|    EspTracer = false,
    39|    EspColor = Color3.fromRGB(255, 50, 50),
    40|    EspSkeletonColor = Color3.fromRGB(255, 255, 0),
    41|    EspTracerColor = Color3.fromRGB(0, 255, 100),
    42|
    43|    -- AIMBOT
    44|    AimEnabled = false,
    45|    AimFOV = 200,
    46|    AimSmooth = 1,           -- 1 = instant lock
    47|    AimWallCheck = true,
    48|    AimOnShoot = false,
    49|    AimShowFOV = true,
    50|    AimPart = "Head",
    51|    AimPrediction = true,     -- NEW: Dự đoán vị trí
    52|    AimPredAmount = 0.12,     -- Hệ số prediction
    53|
    54|    -- PLAYER
    55|    InfJump = false,
    56|    Speed = 32,
    57|    SpeedEnabled = false,
    58|
    59|    -- MISC
    60|    HitboxSize = 2,
    61|}
    62|
    63|-- ═══════════════════════════════════════════════════════
    64|-- STATE
    65|-- ═══════════════════════════════════════════════════════
    66|local espData = {}           -- [Player] = { drawing objects }
    67|local isShooting = false
    68|local menuVisible = true
    69|
    70|-- ═══════════════════════════════════════════════════════
    71|-- UTILITY: World → Screen
    72|-- ═══════════════════════════════════════════════════════
    73|local function worldToScreen(worldPos)
    74|    local vec, onScreen = Camera:WorldToViewportPoint(worldPos)
    75|    return Vector2.new(vec.X, vec.Y), onScreen, vec.Z
    76|end
    77|
    78|-- ═══════════════════════════════════════════════════════
    79|-- SKELETON BONE DEFINITIONS
    80|-- Hỗ trợ cả R15 và R6
    81|-- ═══════════════════════════════════════════════════════
    82|local SKELETON_BONES = {
    83|    -- R15 bones
    84|    {from = "Head",             to = "UpperTorso"},
    85|    {from = "UpperTorso",       to = "LowerTorso"},
    86|    {from = "UpperTorso",       to = "LeftUpperArm"},
    87|    {from = "UpperTorso",       to = "RightUpperArm"},
    88|    {from = "LeftUpperArm",     to = "LeftLowerArm"},
    89|    {from = "RightUpperArm",    to = "RightLowerArm"},
    90|    {from = "LeftLowerArm",     to = "LeftHand"},
    91|    {from = "RightLowerArm",    to = "RightHand"},
    92|    {from = "LowerTorso",       to = "LeftUpperLeg"},
    93|    {from = "LowerTorso",       to = "RightUpperLeg"},
    94|    {from = "LeftUpperLeg",     to = "LeftLowerLeg"},
    95|    {from = "RightUpperLeg",    to = "RightLowerLeg"},
    96|    {from = "LeftLowerLeg",     to = "LeftFoot"},
    97|    {from = "RightLowerLeg",    to = "RightFoot"},
    98|    -- R6 fallback bones
    99|    {from = "Head",             to = "Torso"},
   100|    {from = "Torso",            to = "Left Arm"},
   101|    {from = "Torso",            to = "Right Arm"},
   102|    {from = "Torso",            to = "Left Leg"},
   103|    {from = "Torso",            to = "Right Leg"},
   104|}
   105|
   106|-- ═══════════════════════════════════════════════════════
   107|-- ESP: Tạo Drawing objects cho 1 player
   108|-- ═══════════════════════════════════════════════════════
   109|local function createPlayerEsp(player)
   110|    if player == LocalPlayer then return end
   111|
   112|    local d = {}
   113|
   114|    -- BOX: dùng 4 Line (tương thích nhiều executor hơn Square)
   115|    d.boxTop    = Drawing.new("Line")
   116|    d.boxBottom = Drawing.new("Line")
   117|    d.boxLeft   = Drawing.new("Line")
   118|    d.boxRight  = Drawing.new("Line")
   119|
   120|    for _, line in pairs({d.boxTop, d.boxBottom, d.boxLeft, d.boxRight}) do
   121|        line.Visible = false
   122|        line.Color = CFG.EspColor
   123|        line.Thickness = 1.5
   124|        line.Transparency = 1
   125|        line.ZIndex = 10
   126|    end
   127|
   128|    -- NAME text (trên đầu)
   129|    d.name = Drawing.new("Text")
   130|    d.name.Visible = false
   131|    d.name.Center = true
   132|    d.name.Outline = true
   133|    d.name.OutlineColor = Color3.new(0, 0, 0)
   134|    d.name.Color = CFG.EspColor
   135|    d.name.Size = 14
   136|    d.name.Font = 2
   137|    d.name.ZIndex = 11
   138|
   139|    -- HP BAR background (bên trái box) — dùng Line cho tương thích executor
   140|    d.hpBg = Drawing.new("Line")
   141|    d.hpBg.Visible = false
   142|    d.hpBg.Color = Color3.fromRGB(20, 20, 20)
   143|    d.hpBg.Thickness = 4
   144|    d.hpBg.Transparency = 0.6
   145|    d.hpBg.ZIndex = 9
   146|
   147|    -- HP BAR fill (bên trái box, mọc từ dưới lên) — dùng Line
   148|    d.hpBar = Drawing.new("Line")
   149|    d.hpBar.Visible = false
   150|    d.hpBar.Color = Color3.fromRGB(0, 255, 0)
   151|    d.hpBar.Thickness = 4
   152|    d.hpBar.Transparency = 0.9
   153|    d.hpBar.ZIndex = 10
   154|
   155|    -- HP TEXT (hiển thị số "75/100" bên phải box)
   156|    d.hpText = Drawing.new("Text")
   157|    d.hpText.Visible = false
   158|    d.hpText.Center = false
   159|    d.hpText.Outline = true
   160|    d.hpText.OutlineColor = Color3.new(0, 0, 0)
   161|    d.hpText.Color = Color3.fromRGB(0, 255, 0)
   162|    d.hpText.Size = 12
   163|    d.hpText.Font = 2
   164|    d.hpText.ZIndex = 11
   165|
   166|    -- METER text (khoảng cách dưới chân)
   167|    d.meter = Drawing.new("Text")
   168|    d.meter.Visible = false
   169|    d.meter.Center = true
   170|    d.meter.Outline = true
   171|    d.meter.OutlineColor = Color3.new(0, 0, 0)
   172|    d.meter.Color = Color3.fromRGB(200, 200, 200)
   173|    d.meter.Size = 11
   174|    d.meter.Font = 2
   175|    d.meter.ZIndex = 11
   176|
   177|    -- TRACER line (dây từ dưới màn hình lên player)
   178|    d.tracer = Drawing.new("Line")
   179|    d.tracer.Visible = false
   180|    d.tracer.Color = CFG.EspTracerColor
   181|    d.tracer.Thickness = 1.2
   182|    d.tracer.Transparency = 0.7
   183|    d.tracer.ZIndex = 5
   184|
   185|    -- SKELETON lines (mỗi bone = 1 line)
   186|    d.skeletonLines = {}
   187|    for i, bone in ipairs(SKELETON_BONES) do
   188|        local line = Drawing.new("Line")
   189|        line.Visible = false
   190|        line.Color = CFG.EspSkeletonColor
   191|        line.Thickness = 1.5
   192|        line.Transparency = 0.9
   193|        line.ZIndex = 8
   194|        d.skeletonLines[i] = {
   195|            line = line,
   196|            fromName = bone.from,
   197|            toName = bone.to,
   198|        }
   199|    end
   200|
   201|    d.player = player
   202|    espData[player] = d
   203|end
   204|
   205|-- ═══════════════════════════════════════════════════════
   206|-- ESP: Xóa Drawing objects khi player rời
   207|-- ═══════════════════════════════════════════════════════
   208|local function removePlayerEsp(player)
   209|    local d = espData[player]
   210|    if not d then return end
   211|
   212|    pcall(function() d.boxTop:Remove() end)
   213|    pcall(function() d.boxBottom:Remove() end)
   214|    pcall(function() d.boxLeft:Remove() end)
   215|    pcall(function() d.boxRight:Remove() end)
   216|    pcall(function() d.name:Remove() end)
   217|    pcall(function() d.hpBg:Remove() end)
   218|    pcall(function() d.hpBar:Remove() end)
   219|    pcall(function() d.hpText:Remove() end)
   220|    pcall(function() d.meter:Remove() end)
   221|    pcall(function() d.tracer:Remove() end)
   222|
   223|    for _, skel in ipairs(d.skeletonLines) do
   224|        pcall(function() skel.line:Remove() end)
   225|    end
   226|
   227|    espData[player] = nil
   228|end
   229|
   230|-- ═══════════════════════════════════════════════════════
   231|-- ESP: Ẩn tất cả drawing objects của 1 player
   232|-- ═══════════════════════════════════════════════════════
   233|local function hidePlayerEsp(d)
   234|    d.boxTop.Visible = false
   235|    d.boxBottom.Visible = false
   236|    d.boxLeft.Visible = false
   237|    d.boxRight.Visible = false
   238|    d.name.Visible = false
   239|    d.hpBg.Visible = false
   240|    d.hpBar.Visible = false
   241|    d.hpText.Visible = false
   242|    d.meter.Visible = false
   243|    d.tracer.Visible = false
   244|    for _, skel in ipairs(d.skeletonLines) do
   245|        skel.line.Visible = false
   246|    end
   247|end
   248|
   249|-- ═══════════════════════════════════════════════════════
   250|-- ESP: Ẩn tất cả (khi tắt ESP)
   251|-- ═══════════════════════════════════════════════════════
   252|local function hideAllEsp()
   253|    for _, d in pairs(espData) do
   254|        hidePlayerEsp(d)
   255|    end
   256|end
   257|
   258|-- ═══════════════════════════════════════════════════════
   259|-- ESP: Cập nhật mỗi frame
   260|-- ═══════════════════════════════════════════════════════
   261|local function updateEsp()
   262|    local myChar = LocalPlayer.Character
   263|    local myHRP = myChar and myChar:FindFirstChild("HumanoidRootPart")
   264|
   265|    for player, d in pairs(espData) do
   266|        -- Nếu ESP tắt, ẩn hết
   267|        if not CFG.EspEnabled then
   268|            hidePlayerEsp(d)
   269|            continue
   270|        end
   271|
   272|        local char = player.Character
   273|        local hum = char and char:FindFirstChildOfClass("Humanoid")
   274|        local head = char and char:FindFirstChild("Head")
   275|        local hrp = char and char:FindFirstChild("HumanoidRootPart")
   276|
   277|        -- Không có character hoặc đã chết → ẩn
   278|        if not char or not hum or hum.Health <= 0 or not head or not hrp then
   279|            hidePlayerEsp(d)
   280|            continue
   281|        end
   282|
   283|        -- ─── Tính vị trí 2D ───
   284|        -- Head position (trên cùng)
   285|        local headScreen, headOnScreen = worldToScreen(head.Position + Vector3.new(0, 0.5, 0))
   286|
   287|        -- Feet position (dưới cùng)
   288|        local feetY
   289|        local leftFoot = char:FindFirstChild("LeftFoot")
   290|        local rightFoot = char:FindFirstChild("RightFoot")
   291|        if leftFoot and rightFoot then
   292|            -- R15: lấy Y thấp nhất của 2 chân
   293|            feetY = math.min(leftFoot.Position.Y, rightFoot.Position.Y)
   294|        else
   295|            -- R6: tính từ HRP - HipHeight
   296|            feetY = hrp.Position.Y - hum.HipHeight * 2
   297|        end
   298|        local feetScreen, feetOnScreen = worldToScreen(Vector3.new(hrp.Position.X, feetY, hrp.Position.Z))
   299|
   300|        -- Root position (giữa người)
   301|        local rootScreen, rootOnScreen = worldToScreen(hrp.Position)
   302|
   303|        local isVisible = headOnScreen and feetOnScreen and rootOnScreen
   304|
   305|        -- ═══ BOX ESP (4 lines) ═══
   306|        if CFG.EspBox and isVisible then
   307|            local boxHeight = math.abs(feetScreen.Y - headScreen.Y)
   308|            local boxWidth = boxHeight * 0.55
   309|            local boxLeftX = rootScreen.X - boxWidth / 2
   310|            local boxRightX = rootScreen.X + boxWidth / 2
   311|            local boxTopY = headScreen.Y
   312|            local boxBottomY = feetScreen.Y
   313|
   314|            -- Top line
   315|            d.boxTop.From = Vector2.new(boxLeftX, boxTopY)
   316|            d.boxTop.To = Vector2.new(boxRightX, boxTopY)
   317|            d.boxTop.Color = CFG.EspColor
   318|            d.boxTop.Visible = true
   319|
   320|            -- Bottom line
   321|            d.boxBottom.From = Vector2.new(boxLeftX, boxBottomY)
   322|            d.boxBottom.To = Vector2.new(boxRightX, boxBottomY)
   323|            d.boxBottom.Color = CFG.EspColor
   324|            d.boxBottom.Visible = true
   325|
   326|            -- Left line
   327|            d.boxLeft.From = Vector2.new(boxLeftX, boxTopY)
   328|            d.boxLeft.To = Vector2.new(boxLeftX, boxBottomY)
   329|            d.boxLeft.Color = CFG.EspColor
   330|            d.boxLeft.Visible = true
   331|
   332|            -- Right line
   333|            d.boxRight.From = Vector2.new(boxRightX, boxTopY)
   334|            d.boxRight.To = Vector2.new(boxRightX, boxBottomY)
   335|            d.boxRight.Color = CFG.EspColor
   336|            d.boxRight.Visible = true
   337|        else
   338|            d.boxTop.Visible = false
   339|            d.boxBottom.Visible = false
   340|            d.boxLeft.Visible = false
   341|            d.boxRight.Visible = false
   342|        end
   343|
   344|        -- ═══ NAME ESP (trên đầu box) ═══
   345|        if CFG.EspName and isVisible then
   346|            d.name.Text = player.DisplayName or player.Name
   347|            d.name.Position = Vector2.new(rootScreen.X, headScreen.Y - 18)
   348|            d.name.Color = CFG.EspColor
   349|            d.name.Visible = true
   350|        else
   351|            d.name.Visible = false
   352|        end
   353|
   354|        -- ═══ HP BAR (bên trái box, mọc từ dưới lên, dùng Line) ═══
   355|        if CFG.EspHP and isVisible then
   356|            local boxHeight = math.abs(feetScreen.Y - headScreen.Y)
   357|            local boxWidth = boxHeight * 0.55
   358|            local barX = rootScreen.X - boxWidth / 2 - 6
   359|
   360|            local healthPct = math.clamp(hum.Health / hum.MaxHealth, 0, 1)
   361|
   362|            -- Background line (full height, đen mờ)
   363|            d.hpBg.From = Vector2.new(barX, headScreen.Y)
   364|            d.hpBg.To = Vector2.new(barX, feetScreen.Y)
   365|            d.hpBg.Color = Color3.fromRGB(20, 20, 20)
   366|            d.hpBg.Thickness = 4
   367|            d.hpBg.Visible = true
   368|
   369|            -- Fill line (mọc từ dưới lên, màu theo %)
   370|            local fillTopY = feetScreen.Y - (boxHeight * healthPct)
   371|            d.hpBar.From = Vector2.new(barX, fillTopY)
   372|            d.hpBar.To = Vector2.new(barX, feetScreen.Y)
   373|            d.hpBar.Thickness = 4
   374|
   375|            -- Đổi màu theo máu: xanh lá > vàng > đỏ
   376|            if healthPct > 0.6 then
   377|                d.hpBar.Color = Color3.fromRGB(0, 255, 0)
   378|            elseif healthPct > 0.3 then
   379|                d.hpBar.Color = Color3.fromRGB(255, 255, 0)
   380|            else
   381|                d.hpBar.Color = Color3.fromRGB(255, 0, 0)
   382|            end
   383|            d.hpBar.Visible = true
   384|        else
   385|            d.hpBg.Visible = false
   386|            d.hpBar.Visible = false
   387|        end
   388|
   389|        -- ═══ HP TEXT (hiển thị số "75/100" bên phải box) ═══
   390|        if CFG.EspHPText and isVisible then
   391|            local currentHP = math.floor(hum.Health)
   392|            local maxHP = math.floor(hum.MaxHealth)
   393|            local healthPct = currentHP / maxHP
   394|
   395|            d.hpText.Text = currentHP .. "/" .. maxHP
   396|
   397|            -- Đặt bên phải box
   398|            local boxHeight = math.abs(feetScreen.Y - headScreen.Y)
   399|            local boxWidth = boxHeight * 0.55
   400|            d.hpText.Position = Vector2.new(rootScreen.X + boxWidth / 2 + 4, headScreen.Y)
   401|
   402|            -- Đổi màu theo máu
   403|            if healthPct > 0.6 then
   404|                d.hpText.Color = Color3.fromRGB(0, 255, 0)
   405|            elseif healthPct > 0.3 then
   406|                d.hpText.Color = Color3.fromRGB(255, 255, 0)
   407|            else
   408|                d.hpText.Color = Color3.fromRGB(255, 0, 0)
   409|            end
   410|            d.hpText.Visible = true
   411|        else
   412|            d.hpText.Visible = false
   413|        end
   414|
   415|        -- ═══ METER (khoảng cách dưới chân) ═══
   416|        if CFG.EspMeters and isVisible and myHRP then
   417|            local dist = math.floor((myHRP.Position - hrp.Position).Magnitude)
   418|            d.meter.Text = dist .. "m"
   419|            d.meter.Position = Vector2.new(rootScreen.X, feetScreen.Y + 4)
   420|            d.meter.Visible = true
   421|        else
   422|            d.meter.Visible = false
   423|        end
   424|
   425|        -- ═══ TRACER (dây từ TRÊN màn hình → giữa người) ═══
   426|        if CFG.EspTracer and rootOnScreen then
   427|            local screenTop = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y * 0.02)
   428|            d.tracer.From = screenTop
   429|            d.tracer.To = rootScreen
   430|            d.tracer.Color = CFG.EspTracerColor
   431|            d.tracer.Visible = true
   432|        else
   433|            d.tracer.Visible = false
   434|        end
   435|
   436|        -- ═══ SKELETON ESP (nối xương) ═══
   437|        if CFG.EspSkeleton and isVisible then
   438|            for _, skel in ipairs(d.skeletonLines) do
   439|                local partFrom = char:FindFirstChild(skel.fromName)
   440|                local partTo = char:FindFirstChild(skel.toName)
   441|
   442|                if partFrom and partTo then
   443|                    local fromScreen, fromOnScreen = worldToScreen(partFrom.Position)
   444|                    local toScreen, toOnScreen = worldToScreen(partTo.Position)
   445|
   446|                    if fromOnScreen and toOnScreen then
   447|                        skel.line.From = fromScreen
   448|                        skel.line.To = toScreen
   449|                        skel.line.Color = CFG.EspSkeletonColor
   450|                        skel.line.Visible = true
   451|                    else
   452|                        skel.line.Visible = false
   453|                    end
   454|                else
   455|                    skel.line.Visible = false
   456|                end
   457|            end
   458|        else
   459|            for _, skel in ipairs(d.skeletonLines) do
   460|                skel.line.Visible = false
   461|            end
   462|        end
   463|    end
   464|end
   465|
   466|-- ═══════════════════════════════════════════════════════
   467|-- AIMBOT: Kiểm tra có nhìn thấy target không (wall check)
   468|-- ═══════════════════════════════════════════════════════
   469|local function isPartVisible(targetPart)
   470|    if not CFG.AimWallCheck then return true end
   471|
   472|    local myChar = LocalPlayer.Character
   473|    if not myChar or not myChar:FindFirstChild("Head") then return false end
   474|
   475|    local origin = myChar.Head.Position
   476|    local direction = (targetPart.Position - origin)
   477|
   478|    local params = RaycastParams.new()
   479|    params.FilterType = Enum.RaycastFilterType.Exclude
   480|    params.FilterDescendantsInstances = {myChar}
   481|
   482|    local result = workspace:Raycast(origin, direction, params)
   483|    if result then
   484|        -- Nếu raycast trúng 1 phần thuộc character của target → OK
   485|        return result.Instance:IsDescendantOf(targetPart.Parent)
   486|    end
   487|    return true  -- Không bị chặn
   488|end
   489|
   490|-- ═══════════════════════════════════════════════════════
   491|-- AIMBOT: Lấy bộ phận aim trên character
   492|-- ═══════════════════════════════════════════════════════
   493|local function getAimPart(char)
   494|    if CFG.AimPart == "Head" then
   495|        return char:FindFirstChild("Head")
   496|    elseif CFG.AimPart == "Torso" then
   497|        return char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso")
   498|    else
   499|        return char:FindFirstChild("HumanoidRootPart")
   500|    end
   501|end
   502|
   503|-- ═══════════════════════════════════════════════════════
   504|-- AIMBOT: Tìm player gần nhất trong FOV
   505|-- ═══════════════════════════════════════════════════════
   506|local function getTarget()
   507|    local bestTarget = nil
   508|    local bestDist = CFG.AimFOV
   509|    local screenCenter = Vector2.new(Camera.ViewportSize.X / 2, Camera.ViewportSize.Y / 2)
   510|
   511|    for _, player in pairs(Players:GetPlayers()) do
   512|        if player == LocalPlayer then continue end
   513|        if not player.Character then continue end
   514|
   515|        local hum = player.Character:FindFirstChildOfClass("Humanoid")
   516|        local part = getAimPart(player.Character)
   517|
   518|        if not part or not hum or hum.Health <= 0 then continue end
   519|
   520|        local screenPos, onScreen = Camera:WorldToViewportPoint(part.Position)
   521|        if not onScreen then continue end
   522|
   523|        local screenPoint = Vector2.new(screenPos.X, screenPos.Y)
   524|        local dist = (screenPoint - screenCenter).Magnitude
   525|
   526|        if dist < bestDist and isPartVisible(part) then
   527|            bestDist = dist
   528|            bestTarget = {
   529|                part = part,
   530|                player = player,
   531|                character = player.Character,
   532|            }
   533|        end
   534|    end
   535|
   536|    return bestTarget
   537|end
   538|
   539|-- ═══════════════════════════════════════════════════════
   540|-- AIMBOT: Aim vào target (với prediction)
   541|-- ═══════════════════════════════════════════════════════
   542|local function aimAt(target)
   543|    if not target or not target.part then return end
   544|
   545|    local myChar = LocalPlayer.Character
   546|    if not myChar then return end
   547|
   548|    local aimPos = target.part.Position
   549|
   550|    -- Prediction: dự đoán vị trí dựa trên velocity
   551|    if CFG.AimPrediction and target.character then
   552|        local hrp = target.character:FindFirstChild("HumanoidRootPart")
   553|        if hrp then
   554|            local velocity = hrp.Velocity
   555|            local dist = (hrp.Position - Camera.CFrame.Position).Magnitude
   556|            aimPos = aimPos + velocity * CFG.AimPredAmount * (dist / 100)
   557|        end
   558|    end
   559|
   560|    -- Aim bằng Camera.CFrame.Position (chính xác hơn Head.Position)
   561|    local camPos = Camera.CFrame.Position
   562|    local goalCFrame = CFrame.new(camPos, aimPos)
   563|
   564|    local smooth = CFG.AimSmooth
   565|    if smooth <= 1 then
   566|        Camera.CFrame = goalCFrame
   567|    else
   568|        Camera.CFrame = Camera.CFrame:Lerp(goalCFrame, 1 / smooth)
   569|    end
   570|end
   571|
-- FOV Circle variables (khởi tạo sau khi ScreenGui tạo xong)
local fovFrame = nil
local fovStroke = nil
   596|
   597|-- AimOnShoot: dùng IsMouseButtonPressed mỗi frame trong loop
   598|-- không依赖 event vì game consume MouseButton1
   599|
   600|UserInputService.InputEnded:Connect(function(input)
   601|    if input.UserInputType == Enum.UserInputType.MouseButton1 then
   602|        isShooting = false
   603|    end
   604|end)
   605|
   606|-- ═══════════════════════════════════════════════════════
   607|-- INFINITY JUMP
   608|-- ═══════════════════════════════════════════════════════
   609|UserInputService.JumpRequest:Connect(function()
   610|    if CFG.InfJump then
   611|        local char = LocalPlayer.Character
   612|        if char then
   613|            local hum = char:FindFirstChildOfClass("Humanoid")
   614|            if hum then
   615|                hum:ChangeState(Enum.HumanoidStateType.Jumping)
   616|            end
   617|        end
   618|    end
   619|end)
   620|
   621|-- ═══════════════════════════════════════════════════════
   622|-- SPEED: Áp dụng khi respawn
   623|-- ═══════════════════════════════════════════════════════
   624|LocalPlayer.CharacterAdded:Connect(function(char)
   625|    task.wait(1)
   626|    local hum = char:WaitForChild("Humanoid", 5)
   627|    if hum then
   628|        hum.WalkSpeed = CFG.SpeedEnabled and CFG.Speed or 16
   629|    end
   630|end)
   631|
   632|-- ═══════════════════════════════════════════════════════
   633|-- HITBOX: Áp dụng hitbox expand
   634|-- ═══════════════════════════════════════════════════════
   635|local function applyHitbox(char, size)
   636|    local hrp = char:WaitForChild("HumanoidRootPart", 5)
   637|    if hrp then
   638|        hrp.Size = Vector3.new(size, size, size)
   639|        hrp.Transparency = 0.7
   640|        hrp.BrickColor = BrickColor.new("Really red")
   641|        hrp.Material = Enum.Material.Neon
   642|        hrp.CanCollide = false
   643|    end
   644|end
   645|
   646|local function resetAllHitboxes()
   647|    for _, player in pairs(Players:GetPlayers()) do
   648|        if player ~= LocalPlayer and player.Character then
   649|            local hrp = player.Character:FindFirstChild("HumanoidRootPart")
   650|            if hrp then
   651|                hrp.Size = Vector3.new(2, 2, 1)
   652|                hrp.Transparency = 1
   653|                hrp.Material = Enum.Material.Plastic
   654|                hrp.CanCollide = false
   655|            end
   656|        end
   657|    end
   658|end
   659|
   660|
-- ═══════════════════════════════════════════════════════════════
-- GUI v12: Menu cố định, vuốt mượt, thiết kế mới
-- ═══════════════════════════════════════════════════════════════
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "HoangAnhHub"
ScreenGui.ResetOnSpawn = false
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ScreenGui.Parent = PlayerGui

-- ─── FOV CIRCLE (tạo SAU ScreenGui) ───
fovFrame = Instance.new("Frame")
fovFrame.Name = "FOVCircle"
fovFrame.AnchorPoint = Vector2.new(0.5, 0.5)
fovFrame.Position = UDim2.new(0.5, 0, 0.5, 0)
fovFrame.Size = UDim2.new(0, CFG.AimFOV * 2, 0, CFG.AimFOV * 2)
fovFrame.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
fovFrame.BackgroundTransparency = 0.85
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
fovStroke.Transparency = 0.3
fovStroke.Parent = fovFrame

-- ─── KÍCH THƯỚC MENU (cố định) ───
local MENU_WIDTH = 370
local MENU_HEIGHT = 460
local TITLE_HEIGHT = 36
local TAB_HEIGHT = 30
local CONTENT_TOP = TITLE_HEIGHT + TAB_HEIGHT + 8  -- offset cho content area
local CONTENT_HEIGHT = MENU_HEIGHT - CONTENT_TOP - 10  -- trừ padding dưới

-- ═══════════════════════════════════════════════════════════════
-- TOGGLE BUTTON (HA icon)
-- ═══════════════════════════════════════════════════════════════
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
-- MAIN FRAME (kích thước cố định)
-- ═══════════════════════════════════════════════════════════════
local Main = Instance.new("Frame")
Main.Size = UDim2.new(0, MENU_WIDTH, 0, MENU_HEIGHT)
Main.Position = UDim2.new(0.5, -MENU_WIDTH/2, 0.12, 0)
Main.BackgroundColor3 = Color3.fromRGB(14, 14, 22)
Main.BackgroundTransparency = 0.02
Main.BorderSizePixel = 0
Main.Active = true
Main.Draggable = true
Main.Parent = ScreenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 10)
mainCorner.Parent = Main

local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(0, 140, 255)
mainStroke.Thickness = 1.5
mainStroke.Transparency = 0.1
mainStroke.Parent = Main

-- ═══════════════════════════════════════════════════════════════
-- TITLE BAR
-- ═══════════════════════════════════════════════════════════════
local Title = Instance.new("Frame")
Title.Size = UDim2.new(1, 0, 0, TITLE_HEIGHT)
Title.BackgroundColor3 = Color3.fromRGB(0, 60, 140)
Title.BorderSizePixel = 0
Title.Parent = Main

local titleCorner = Instance.new("UICorner")
titleCorner.CornerRadius = UDim.new(0, 10)
titleCorner.Parent = Title

local TitleFill = Instance.new("Frame")
TitleFill.Size = UDim2.new(1, 0, 0, 10)
TitleFill.Position = UDim2.new(0, 0, 1, -10)
TitleFill.BackgroundColor3 = Color3.fromRGB(0, 60, 140)
TitleFill.BorderSizePixel = 0
TitleFill.Parent = Title

local TitleText = Instance.new("TextLabel")
TitleText.Size = UDim2.new(1, -50, 1, 0)
TitleText.Position = UDim2.new(0, 12, 0, 0)
TitleText.BackgroundTransparency = 1
TitleText.Text = "⚡ " .. CFG.HubName .. " " .. CFG.Version
TitleText.TextColor3 = Color3.fromRGB(255, 255, 255)
TitleText.TextSize = 15
TitleText.Font = Enum.Font.GothamBold
TitleText.TextXAlignment = Enum.TextXAlignment.Left
TitleText.Parent = Title

local CloseBtn = Instance.new("TextButton")
CloseBtn.Size = UDim2.new(0, 24, 0, 24)
CloseBtn.Position = UDim2.new(1, -28, 0, 6)
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

-- ═══════════════════════════════════════════════════════════════
-- TAB BAR
-- ═══════════════════════════════════════════════════════════════
local TabBar = Instance.new("Frame")
TabBar.Size = UDim2.new(1, -16, 0, TAB_HEIGHT - 4)
TabBar.Position = UDim2.new(0, 8, 0, TITLE_HEIGHT + 2)
TabBar.BackgroundTransparency = 1
TabBar.Parent = Main

local TabLayout = Instance.new("UIListLayout")
TabLayout.FillDirection = Enum.FillDirection.Horizontal
TabLayout.Padding = UDim.new(0, 4)
TabLayout.SortOrder = Enum.SortOrder.LayoutOrder
TabLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
TabLayout.Parent = TabBar

local tabButtons = {}
local tabPages = {}

-- ═══════════════════════════════════════════════════════════════
-- CREATE TAB (mỗi tab có ScrollingFrame riêng, vuốt mượt)
-- ═══════════════════════════════════════════════════════════════
local function createTab(name, emoji, order)
    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(0, 0, 0, 26)
    btn.AutomaticSize = Enum.AutomaticSize.X
    btn.BackgroundColor3 = Color3.fromRGB(24, 24, 38)
    btn.BorderSizePixel = 0
    btn.Text = "  " .. emoji .. " " .. name .. "  "
    btn.TextColor3 = Color3.fromRGB(130, 130, 150)
    btn.TextSize = 12
    btn.Font = Enum.Font.GothamBold
    btn.LayoutOrder = order
    btn.Parent = TabBar

    local btnCorner = Instance.new("UICorner")
    btnCorner.CornerRadius = UDim.new(0, 6)
    btnCorner.Parent = btn

    -- Content page (ScrollingFrame — vuốt xuống khi nội dung dài)
    local page = Instance.new("ScrollingFrame")
    page.Size = UDim2.new(1, -16, 0, CONTENT_HEIGHT)
    page.Position = UDim2.new(0, 8, 0, CONTENT_TOP)
    page.BackgroundTransparency = 1
    page.BorderSizePixel = 0
    page.ScrollBarThickness = 3
    page.ScrollBarImageColor3 = Color3.fromRGB(0, 140, 255)
    page.ScrollBarImageTransparency = 0.3
    page.CanvasSize = UDim2.new(0, 0, 0, 0)
    page.AutomaticCanvasSize = Enum.AutomaticSize.Y
    page.ScrollingDirection = Enum.ScrollingDirection.Y
    page.ElasticBehavior = Enum.ElasticBehavior.Always
    page.Visible = false
    page.Parent = Main

    local pageLayout = Instance.new("UIListLayout")
    pageLayout.Padding = UDim.new(0, 4)
    pageLayout.SortOrder = Enum.SortOrder.LayoutOrder
    pageLayout.Parent = page

    local pagePadding = Instance.new("UIPadding")
    pagePadding.PaddingLeft = UDim.new(0, 4)
    pagePadding.PaddingRight = UDim.new(0, 4)
    pagePadding.PaddingTop = UDim.new(0, 2)
    pagePadding.PaddingBottom = UDim.new(0, 8)
    pagePadding.Parent = page

    tabButtons[name] = btn
    tabPages[name] = page

    btn.MouseButton1Click:Connect(function()
        for tabName, tabPage in pairs(tabPages) do
            tabPage.Visible = (tabName == name)
        end
        for tabName, tabBtn in pairs(tabButtons) do
            if tabName == name then
                tabBtn.BackgroundColor3 = Color3.fromRGB(0, 90, 190)
                tabBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
            else
                tabBtn.BackgroundColor3 = Color3.fromRGB(24, 24, 38)
                tabBtn.TextColor3 = Color3.fromRGB(130, 130, 150)
            end
        end
    end)

    return page
end

-- ═══════════════════════════════════════════════════════════════
-- UI BUILDER FUNCTIONS (mỗi tab có counter riêng)
-- ═══════════════════════════════════════════════════════════════
local tabCounters = {}  -- [tabPage] = order counter

local function getNextOrder(page)
    if not tabCounters[page] then tabCounters[page] = 0 end
    tabCounters[page] = tabCounters[page] + 1
    return tabCounters[page]
end

local function sectionHeader(parentPage, text, icon)
    local order = getNextOrder(parentPage)

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 24)
    frame.BackgroundColor3 = Color3.fromRGB(0, 60, 130)
    frame.BackgroundTransparency = 0.5
    frame.BorderSizePixel = 0
    frame.LayoutOrder = order
    frame.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = frame

    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -10, 1, 0)
    label.Position = UDim2.new(0, 10, 0, 0)
    label.BackgroundTransparency = 1
    label.Text = icon .. " " .. text
    label.TextColor3 = Color3.fromRGB(0, 200, 255)
    label.TextSize = 12
    label.Font = Enum.Font.GothamBold
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = frame

    return frame
end

local function toggleBtn(parentPage, text, defaultValue, callback)
    local order = getNextOrder(parentPage)

    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 30)
    btn.BackgroundColor3 = defaultValue and Color3.fromRGB(12, 50, 12) or Color3.fromRGB(28, 28, 42)
    btn.BorderSizePixel = 0
    btn.Text = ""
    btn.LayoutOrder = order
    btn.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = btn

    -- Label bên trái
    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, -56, 1, 0)
    label.Position = UDim2.new(0, 12, 0, 0)
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.fromRGB(200, 200, 210)
    label.TextSize = 12
    label.Font = Enum.Font.GothamMedium
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = btn

    -- Toggle indicator bên phải
    local indicator = Instance.new("Frame")
    indicator.Size = UDim2.new(0, 36, 0, 18)
    indicator.Position = UDim2.new(1, -46, 0.5, -9)
    indicator.BackgroundColor3 = defaultValue and Color3.fromRGB(0, 180, 80) or Color3.fromRGB(60, 60, 75)
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
        btn.BackgroundColor3 = state and Color3.fromRGB(12, 50, 12) or Color3.fromRGB(28, 28, 42)
        indicator.BackgroundColor3 = state and Color3.fromRGB(0, 180, 80) or Color3.fromRGB(60, 60, 75)
        dot.Position = state and UDim2.new(1, -16, 0.5, -7) or UDim2.new(0, 2, 0.5, -7)
        callback(state)
    end)

    return btn
end

local function inputRow(parentPage, label, defaultValue, callback)
    local order = getNextOrder(parentPage)

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 28)
    frame.BackgroundColor3 = Color3.fromRGB(28, 28, 42)
    frame.BorderSizePixel = 0
    frame.LayoutOrder = order
    frame.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = frame

    local labelObj = Instance.new("TextLabel")
    labelObj.Size = UDim2.new(0.5, -8, 1, 0)
    labelObj.Position = UDim2.new(0, 12, 0, 0)
    labelObj.BackgroundTransparency = 1
    labelObj.Text = label
    labelObj.TextColor3 = Color3.fromRGB(190, 190, 200)
    labelObj.TextSize = 12
    labelObj.Font = Enum.Font.GothamMedium
    labelObj.TextXAlignment = Enum.TextXAlignment.Left
    labelObj.Parent = frame

    local textBox = Instance.new("TextBox")
    textBox.Size = UDim2.new(0, 60, 0, 20)
    textBox.Position = UDim2.new(1, -72, 0.5, -10)
    textBox.BackgroundColor3 = Color3.fromRGB(18, 18, 30)
    textBox.BorderSizePixel = 0
    textBox.Text = tostring(defaultValue)
    textBox.TextColor3 = Color3.fromRGB(0, 200, 255)
    textBox.TextSize = 12
    textBox.Font = Enum.Font.GothamBold
    textBox.ClearTextOnFocus = false
    textBox.Parent = frame

    local boxCorner = Instance.new("UICorner")
    boxCorner.CornerRadius = UDim.new(0, 5)
    boxCorner.Parent = textBox

    local boxStroke = Instance.new("UIStroke")
    boxStroke.Color = Color3.fromRGB(0, 100, 200)
    boxStroke.Thickness = 1
    boxStroke.Transparency = 0.5
    boxStroke.Parent = textBox

    textBox.FocusLost:Connect(function()
        local num = tonumber(textBox.Text)
        if num then callback(num) end
    end)

    return frame
end

local function actionBtn(parentPage, text, color, callback)
    local order = getNextOrder(parentPage)

    local btn = Instance.new("TextButton")
    btn.Size = UDim2.new(1, 0, 0, 30)
    btn.BackgroundColor3 = color
    btn.BorderSizePixel = 0
    btn.Text = text
    btn.TextColor3 = Color3.fromRGB(255, 255, 255)
    btn.TextSize = 12
    btn.Font = Enum.Font.GothamBold
    btn.LayoutOrder = order
    btn.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = btn

    btn.MouseButton1Click:Connect(callback)
    return btn
end

local function colorRow(parentPage, label, defaultColor, callback)
    local order = getNextOrder(parentPage)

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 28)
    frame.BackgroundColor3 = Color3.fromRGB(28, 28, 42)
    frame.BorderSizePixel = 0
    frame.LayoutOrder = order
    frame.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = frame

    local labelObj = Instance.new("TextLabel")
    labelObj.Size = UDim2.new(0.4, 0, 1, 0)
    labelObj.Position = UDim2.new(0, 12, 0, 0)
    labelObj.BackgroundTransparency = 1
    labelObj.Text = label
    labelObj.TextColor3 = Color3.fromRGB(190, 190, 200)
    labelObj.TextSize = 11
    labelObj.Font = Enum.Font.GothamMedium
    labelObj.TextXAlignment = Enum.TextXAlignment.Left
    labelObj.Parent = frame

    local colors = {
        {"R", Color3.fromRGB(255, 50, 50)},
        {"G", Color3.fromRGB(50, 255, 80)},
        {"Y", Color3.fromRGB(255, 255, 50)},
        {"B", Color3.fromRGB(50, 120, 255)},
        {"P", Color3.fromRGB(180, 50, 255)},
        {"W", Color3.fromRGB(255, 255, 255)},
    }

    for i, c in ipairs(colors) do
        local cb = Instance.new("TextButton")
        cb.Size = UDim2.new(0, 28, 0, 20)
        cb.Position = UDim2.new(0.42 + (i-1) * 0.095, 0, 0.5, -10)
        cb.BackgroundColor3 = c[2]
        cb.BorderSizePixel = 0
        cb.Text = ""
        cb.Parent = frame
        local cc = Instance.new("UICorner")
        cc.CornerRadius = UDim.new(0, 4)
        cc.Parent = cb
        cb.MouseButton1Click:Connect(function() callback(c[2]) end)
    end

    return frame
end

local function selectorRow(parentPage, label, options, default, callback)
    local order = getNextOrder(parentPage)

    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 28)
    frame.BackgroundColor3 = Color3.fromRGB(28, 28, 42)
    frame.BorderSizePixel = 0
    frame.LayoutOrder = order
    frame.Parent = parentPage

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = frame

    local labelObj = Instance.new("TextLabel")
    labelObj.Size = UDim2.new(0.3, 0, 1, 0)
    labelObj.Position = UDim2.new(0, 12, 0, 0)
    labelObj.BackgroundTransparency = 1
    labelObj.Text = label
    labelObj.TextColor3 = Color3.fromRGB(190, 190, 200)
    labelObj.TextSize = 11
    labelObj.Font = Enum.Font.GothamMedium
    labelObj.TextXAlignment = Enum.TextXAlignment.Left
    labelObj.Parent = frame

    local optBtns = {}
    for i, opt in ipairs(options) do
        local ob = Instance.new("TextButton")
        ob.Size = UDim2.new(0.2, 0, 0, 20)
        ob.Position = UDim2.new(0.3 + (i-1) * 0.22, 0, 0.5, -10)
        ob.BackgroundColor3 = (opt == default) and Color3.fromRGB(0, 90, 190) or Color3.fromRGB(38, 38, 55)
        ob.BorderSizePixel = 0
        ob.Text = opt
        ob.TextColor3 = (opt == default) and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(130, 130, 150)
        ob.TextSize = 10
        ob.Font = Enum.Font.GothamBold
        ob.Parent = frame
        local oc = Instance.new("UICorner")
        oc.CornerRadius = UDim.new(0, 5)
        oc.Parent = ob
        optBtns[opt] = ob
        ob.MouseButton1Click:Connect(function()
            for name, b in pairs(optBtns) do
                b.BackgroundColor3 = (name == opt) and Color3.fromRGB(0, 90, 190) or Color3.fromRGB(38, 38, 55)
                b.TextColor3 = (name == opt) and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(130, 130, 150)
            end
            callback(opt)
        end)
    end

    return frame
end

-- ═══════════════════════════════════════════════════════════════
-- BUILD TABS
-- ═══════════════════════════════════════════════════════════════

-- ─── ESP TAB ───
local espPage = createTab("ESP", "👁️", 1)

sectionHeader(espPage, "HIỂN THỊ", "👤")
toggleBtn(espPage, "Bật ESP", false, function(s) CFG.EspEnabled = s; if not s then hideAllEsp() end end)
toggleBtn(espPage, "Box 2D", true, function(s) CFG.EspBox = s end)
toggleBtn(espPage, "Tên Player", true, function(s) CFG.EspName = s end)
toggleBtn(espPage, "Thanh Máu (HP Bar)", true, function(s) CFG.EspHP = s end)
toggleBtn(espPage, "Số Máu (HP Text)", true, function(s) CFG.EspHPText = s end)
toggleBtn(espPage, "💀 Skeleton", false, function(s) CFG.EspSkeleton = s end)
toggleBtn(espPage, "Khoảng Cách", true, function(s) CFG.EspMeters = s end)
toggleBtn(espPage, "Tracer (Dây)", false, function(s) CFG.EspTracer = s end)

sectionHeader(espPage, "MÀU SẮC", "🎨")
colorRow(espPage, "ESP Color:", CFG.EspColor, function(c) CFG.EspColor = c end)
colorRow(espPage, "Skeleton:", CFG.EspSkeletonColor, function(c) CFG.EspSkeletonColor = c end)
colorRow(espPage, "Tracer:", CFG.EspTracerColor, function(c) CFG.EspTracerColor = c end)

-- ─── AIM TAB ───
local aimPage = createTab("AIM", "🎯", 2)

sectionHeader(aimPage, "AIMBOT", "🎯")
toggleBtn(aimPage, "Bật Aimbot", false, function(s) CFG.AimEnabled = s end)
toggleBtn(aimPage, "Check Tường", true, function(s) CFG.AimWallCheck = s end)
toggleBtn(aimPage, "Chỉ Aim khi Bắn", false, function(s) CFG.AimOnShoot = s end)
toggleBtn(aimPage, "Hiện FOV Circle", true, function(s) CFG.AimShowFOV = s end)
toggleBtn(aimPage, "Prediction", true, function(s) CFG.AimPrediction = s end)

sectionHeader(aimPage, "BỘ PHẬN", "🦴")
selectorRow(aimPage, "Aim:", {"Đầu", "Cổ", "Thân"}, "Đầu", function(opt)
    if opt == "Đầu" then CFG.AimPart = "Head"
    elseif opt == "Cổ" then CFG.AimPart = "Torso"
    else CFG.AimPart = "HumanoidRootPart" end
end)

sectionHeader(aimPage, "CÀI ĐẶT", "⚙️")
inputRow(aimPage, "FOV:", 200, function(v) if v > 0 then CFG.AimFOV = v end end)
inputRow(aimPage, "Smooth:", 1, function(v) if v >= 1 then CFG.AimSmooth = v end end)
inputRow(aimPage, "Prediction:", 15, function(v) if v > 0 then CFG.AimPredAmount = v / 100 end end)

-- ─── PLAYER TAB ───
local playerPage = createTab("PLAYER", "🏃", 3)

sectionHeader(playerPage, "MOVEMENT", "🏃")
toggleBtn(playerPage, "Infinity Jump", false, function(s) CFG.InfJump = s end)

sectionHeader(playerPage, "SPEED", "⚡")
toggleBtn(playerPage, "Bật Speed", false, function(s)
    CFG.SpeedEnabled = s
    local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if hum then hum.WalkSpeed = s and CFG.Speed or 16 end
end)
inputRow(playerPage, "Tốc độ:", 32, function(v)
    if v > 0 and v <= 200 then
        CFG.Speed = v
        if CFG.SpeedEnabled then
            local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
            if hum then hum.WalkSpeed = v end
        end
    end
end)

-- ─── MISC TAB ───
local miscPage = createTab("MISC", "⚙️", 4)

sectionHeader(miscPage, "HITBOX", "📐")
inputRow(miscPage, "Size:", 2, function(v) if v > 0 and v <= 100 then CFG.HitboxSize = v end end)

sectionHeader(miscPage, "RESET", "🔄")
actionBtn(miscPage, "🔄 RESET ALL", Color3.fromRGB(170, 35, 35), function()
    CFG.EspEnabled = false; CFG.AimEnabled = false; CFG.InfJump = false
    CFG.SpeedEnabled = false; CFG.HitboxSize = 2
    hideAllEsp(); resetAllHitboxes(); fovFrame.Visible = false
    local hum = LocalPlayer.Character and LocalPlayer.Character:FindFirstChildOfClass("Humanoid")
    if hum then hum.WalkSpeed = 16 end
    StatusLabel.Text = "🔄 Đã reset!"
end)

-- Credit
local creditOrder = getNextOrder(miscPage)
local creditLabel = Instance.new("TextLabel")
creditLabel.Size = UDim2.new(1, 0, 0, 16)
creditLabel.BackgroundTransparency = 1
creditLabel.Text = "by " .. CFG.HubName .. " " .. CFG.Version
creditLabel.TextColor3 = Color3.fromRGB(40, 40, 55)
creditLabel.TextSize = 9
creditLabel.Font = Enum.Font.Gotham
creditLabel.LayoutOrder = creditOrder
creditLabel.Parent = miscPage

-- ═══════════════════════════════════════════════════════════════
-- DEFAULT TAB + MENU TOGGLE
-- ═══════════════════════════════════════════════════════════════
tabButtons["ESP"].BackgroundColor3 = Color3.fromRGB(0, 90, 190)
tabButtons["ESP"].TextColor3 = Color3.fromRGB(255, 255, 255)
tabPages["ESP"].Visible = true

ToggleBtn.MouseButton1Click:Connect(function() menuVisible = not menuVisible; Main.Visible = menuVisible end)
CloseBtn.MouseButton1Click:Connect(function() menuVisible = false; Main.Visible = false end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    if input.KeyCode == Enum.KeyCode.RightShift then
        menuVisible = not menuVisible
        Main.Visible = menuVisible
    end
end)

-- ═══════════════════════════════════════════════════════════════
-- INIT: ESP cho tất cả players
-- ═══════════════════════════════════════════════════════════════
for _, player in pairs(Players:GetPlayers()) do
    if player ~= LocalPlayer then createPlayerEsp(player) end
end
Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function() task.wait(0.5) end)
    createPlayerEsp(player)
end)
Players.PlayerRemoving:Connect(removePlayerEsp)

-- ═══════════════════════════════════════════════════════════════
-- MAIN LOOP
-- ═══════════════════════════════════════════════════════════════
RunService.RenderStepped:Connect(function()
    Camera = workspace.CurrentCamera

    -- HITBOX
    if CFG.HitboxSize > 2 then
        for _, player in pairs(Players:GetPlayers()) do
            if player ~= LocalPlayer and player.Character then
                local hrp = player.Character:FindFirstChild("HumanoidRootPart")
                if hrp and hrp.Size.X ~= CFG.HitboxSize then applyHitbox(player.Character, CFG.HitboxSize) end
            end
        end
    end

    -- ESP
    updateEsp()

    -- AIMBOT
    if CFG.AimEnabled then
        local fovDiameter = CFG.AimFOV * 2
        fovFrame.Size = UDim2.new(0, fovDiameter, 0, fovDiameter)
        fovFrame.Visible = CFG.AimShowFOV

        isShooting = UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton1)
        local shouldAim = (not CFG.AimOnShoot) or isShooting

        if shouldAim then
            local target = getTarget()
            if target then
                aimAt(target)
                fovStroke.Color = Color3.fromRGB(255, 50, 50)
            else
                fovStroke.Color = Color3.fromRGB(255, 255, 255)
            end
        else
            fovStroke.Color = Color3.fromRGB(255, 255, 255)
        end
    else
        fovFrame.Visible = false
    end
end)

-- RAINBOW BORDER
task.spawn(function()
    local hue = 0
    while true do
        hue = (hue + 1) % 360
        local c = Color3.fromHSV(hue / 360, 0.8, 1)
        mainStroke.Color = c
        toggleStroke.Color = c
        task.wait(0.05)
    end
end)

StatusLabel.Text = "⚡ " .. CFG.HubName .. " " .. CFG.Version .. " | RightShift để mở"
print("═══════════════════════════════════════")
print("  ⚡ Hoàng Anh Hub " .. CFG.Version .. " loaded!")
print("  📌 Nút HA hoặc RightShift: mở menu")
print("═══════════════════════════════════════")
