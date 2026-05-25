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

print("Hoàng Anh Hub v21.3 loaded! ESP (Corner Box/Name/Distance/HP/Head Dot/Tracer) + Aimbot + Silent Aim + TriggerBot + Chams + Wallbang + Hitbox + Player + Infinite Jump + Anti-AFK + Keybinds — Liquid Glass UI")
