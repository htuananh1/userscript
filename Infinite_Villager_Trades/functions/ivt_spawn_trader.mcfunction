# Triệu hồi thương nhân lang thang tại tọa độ cố định và gắn tag nhận diện
summon minecraft:wandering_trader 58 110 137

tag @e[type=wandering_trader,x=58,y=110,z=137,r=3,limit=1,sort=nearest] add ivt_custom_trader

# Lên lịch tự động biến mất sau 15 phút (18000 ticks)
schedule function ivt_despawn_trader 18000
