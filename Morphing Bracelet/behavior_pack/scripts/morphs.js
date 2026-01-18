export const morphs = [
  {
    id: "morph:player",
    entity: "minecraft:player",
    type: 0
  },
  {
    id: "morph:zombie",
    entity: "minecraft:zombie",
    type: 1,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_zombie",
    entity: "minecraft:zombie",
    type: 1,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:cow",
    entity: "minecraft:cow",
    type: 2,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_cow",
    entity: "minecraft:cow",
    type: 2,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:skeleton",
    entity: "minecraft:skeleton",
    type: 3
  },
  {
    id: "morph:chicken",
    entity: "minecraft:chicken",
    type: 4,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_chicken",
    entity: "minecraft:chicken",
    type: 4,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:creeper",
    entity: "minecraft:creeper",
    type: 5,
    conditions: "!this.getComponent('minecraft:is_charged')"
  },
  {
    id: "morph:charged_creeper",
    entity: "minecraft:creeper",
    type: 5,
    conditions: "this.getComponent('minecraft:is_charged')"
  },
  {
    id: "morph:white_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value', default: 0 }]) == 0 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_white_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value', default: 0 }]) == 0 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_white_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value', default: 0 }]) == 0 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:orange_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 1 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_orange_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 1 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_orange_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 1 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:magenta_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 2 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_magenta_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 2 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_magenta_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 2 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:light_blue_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 3 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_light_blue_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 3 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_light_blue_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 3 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:yellow_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 4 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_yellow_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 4 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_yellow_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 4 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:lime_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 5 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_lime_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 5 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_lime_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 5 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:pink_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 6 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_pink_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 6 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_pink_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 6 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:gray_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 7 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_gray_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 7 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_gray_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 7 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:light_gray_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 8 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_light_gray_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 8 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_light_gray_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 8 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:cyan_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 9 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_cyan_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 9 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_cyan_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 9 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:purple_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 10 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_purple_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 10 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_purple_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 10 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:blue_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 11 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_blue_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 11 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_blue_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 11 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:brown_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 12 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_brown_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 12 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_brown_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 12 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:green_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 13 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_green_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 13 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_green_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 13 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:red_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 14 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_red_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 14 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_red_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 14 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:black_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 15 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_black_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 15 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_black_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag != 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 0 : null)) && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:sheep', component: 'minecraft:color.value' }]) == 15 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:jeb_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag == 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 1 : null)) && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:baby_jeb_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag == 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 1 : null)) && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_jeb_sheep",
    entity: "minecraft:sheep",
    type: 6,
    conditions: "(this.typeId == 'minecraft:sheep' ? this.nameTag == 'jeb_' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 1 : null)) && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:spider",
    entity: "minecraft:spider",
    type: 7
  },
  {
    id: "morph:pig",
    entity: "minecraft:pig",
    type: 8,
    conditions: "!this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_saddled')"
  },
  {
    id: "morph:baby_pig",
    entity: "minecraft:pig",
    type: 8,
    conditions: "this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_saddled')"
  },
  {
    id: "morph:saddled_pig",
    entity: "minecraft:pig",
    type: 8,
    conditions: "!this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_saddled')"
  },
  {
    id: "morph:enderman",
    entity: "minecraft:enderman",
    type: 9
  },
  {
    id: "morph:bat",
    entity: "minecraft:bat",
    type: 10
  },
  {
    id: "morph:zombified_piglin",
    entity: "minecraft:zombie_pigman",
    type: 11,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_zombified_piglin",
    entity: "minecraft:zombie_pigman",
    type: 11,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:fox",
    entity: "minecraft:fox",
    type: 12,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_fox",
    entity: "minecraft:fox",
    type: 12,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:arctic_fox",
    entity: "minecraft:fox",
    type: 12,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_arctic_fox",
    entity: "minecraft:fox",
    type: 12,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:drowned",
    entity: "minecraft:drowned",
    type: 13,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_drowned",
    entity: "minecraft:drowned",
    type: 13,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:plains_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "(!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_plains_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "(!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:desert_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_desert_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:jungle_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_jungle_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:savanna_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_savanna_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:snow_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_snow_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:swamp_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 5 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_swamp_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 5 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:taiga_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 6 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_taiga_villager",
    entity: "minecraft:villager_v2",
    type: 14,
    conditions: "this.getComponent('minecraft:mark_variant').value == 6 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:wither_skeleton",
    entity: "minecraft:wither_skeleton",
    type: 15
  },
  {
    id: "morph:snow_golem",
    entity: "minecraft:snow_golem",
    type: 16,
    conditions: "!this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_snow_golem",
    entity: "minecraft:snow_golem",
    type: 16,
    conditions: "this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:blaze",
    entity: "minecraft:blaze",
    type: 17
  },
  {
    id: "morph:white_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_white_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tuxedo_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_tuxedo_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:red_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_red_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:siamese_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_siamese_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:british_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_british_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:calico_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 5 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_calico_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:persian_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 6 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_persian_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:ragdoll_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 7 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_ragdoll_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 7 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tabby_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 8 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_tabby_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 8 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:black_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 9 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_black_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 9 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:jellie_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 10 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_jellie_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 10 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_white_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_white_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_tuxedo_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_tuxedo_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_red_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_red_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_siamese_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_siamese_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_british_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_british_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_calico_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 5 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_calico_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_persian_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 6 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_persian_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_ragdoll_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 7 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_ragdoll_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 7 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_tabby_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 8 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_tabby_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 8 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_black_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 9 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_black_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 9 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_jellie_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 10 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_jellie_cat",
    entity: "minecraft:cat",
    type: 18,
    conditions: "this.getComponent('minecraft:variant').value == 10 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:husk",
    entity: "minecraft:husk",
    type: 19,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_husk",
    entity: "minecraft:husk",
    type: 19,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:pale_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_pale_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:ashen_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_ashen_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:black_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_black_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:chestnut_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_chestnut_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:rusty_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_rusty_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:snowy_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 5 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_snowy_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:spotted_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 6 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_spotted_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:striped_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 7 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_striped_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 7 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:woods_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 8 && !this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:baby_woods_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 8 && this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_pale_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_pale_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_ashen_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_ashen_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_black_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_black_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_chestnut_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_chestnut_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_rusty_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_rusty_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_snowy_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 5 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_snowy_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_spotted_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 6 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_spotted_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_striped_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 7 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_striped_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 7 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_woods_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 8 && !this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:tamed_baby_woods_wolf",
    entity: "minecraft:wolf",
    type: 20,
    conditions: "this.getComponent('minecraft:variant').value == 8 && this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_tamed')"
  },
  {
    id: "morph:piglin",
    entity: "minecraft:piglin",
    type: 21,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_piglin",
    entity: "minecraft:piglin",
    type: 21,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:small_salmon",
    entity: "minecraft:salmon",
    type: 22,
    conditions: "this.getComponent('minecraft:scale').value == 0.5"
  },
  {
    id: "morph:salmon",
    entity: "minecraft:salmon",
    type: 22,
    conditions: "this.getComponent('minecraft:scale').value == 1.0"
  },
  {
    id: "morph:large_salmon",
    entity: "minecraft:salmon",
    type: 22,
    conditions: "this.getComponent('minecraft:scale').value == 1.5"
  },
  {
    id: "morph:iron_golem",
    entity: "minecraft:iron_golem",
    type: 23
  },
  {
    id: "morph:lucy_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_lucy_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:cyan_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_cyan_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:gold_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_gold_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:wild_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_wild_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:blue_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_blue_axolotl",
    entity: "minecraft:axolotl",
    type: 24,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:stray",
    entity: "minecraft:stray",
    type: 25
  },
  {
    id: "morph:ocelot",
    entity: "minecraft:ocelot",
    type: 26,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_ocelot",
    entity: "minecraft:ocelot",
    type: 26,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:vindicator",
    entity: "minecraft:vindicator",
    type: 27
  },
  {
    id: "morph:cod",
    entity: "minecraft:cod",
    type: 28
  },
  {
    id: "morph:hoglin",
    entity: "minecraft:hoglin",
    type: 29,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_hoglin",
    entity: "minecraft:hoglin",
    type: 29,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:squid",
    entity: "minecraft:squid",
    type: 30,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_squid",
    entity: "minecraft:squid",
    type: 30,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:piglin_brute",
    entity: "minecraft:piglin_brute",
    type: 31
  },
  {
    id: "morph:creamy_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_creamy_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:brown_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_brown_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:gray_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_gray_llama",
    entity: "minecraft:llama",
    type: 32,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:cave_spider",
    entity: "minecraft:cave_spider",
    type: 33
  },
  {
    id: "morph:red_mooshroom",
    entity: "minecraft:mooshroom",
    type: 34,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_red_mooshroom",
    entity: "minecraft:mooshroom",
    type: 34,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:brown_mooshroom",
    entity: "minecraft:mooshroom",
    type: 34,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_brown_mooshroom",
    entity: "minecraft:mooshroom",
    type: 34,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:plains_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "(!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_plains_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "(!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:desert_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_desert_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:jungle_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_jungle_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:savanna_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_savanna_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:snow_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_snow_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:swamp_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 5 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_swamp_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 5 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:taiga_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 6 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_taiga_zombie_villager",
    entity: "minecraft:zombie_villager_v2",
    type: 35,
    conditions: "this.getComponent('minecraft:mark_variant').value == 6 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:goat",
    entity: "minecraft:goat",
    type: 36,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_goat",
    entity: "minecraft:goat",
    type: 36,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:screaming_goat",
    entity: "minecraft:goat",
    type: 36,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_screaming_goat",
    entity: "minecraft:goat",
    type: 36,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:wither",
    entity: "minecraft:wither",
    type: 37
  },
  {
    id: "morph:dolphin",
    entity: "minecraft:dolphin",
    type: 38,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_dolphin",
    entity: "minecraft:dolphin",
    type: 38,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:zoglin",
    entity: "minecraft:zoglin",
    type: 39,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_zoglin",
    entity: "minecraft:zoglin",
    type: 39,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:bee",
    entity: "minecraft:bee",
    type: 40,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_bee",
    entity: "minecraft:bee",
    type: 40,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:pillager",
    entity: "minecraft:pillager",
    type: 41
  },
  {
    id: "morph:red_parrot",
    entity: "minecraft:parrot",
    type: 42,
    conditions: "!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0"
  },
  {
    id: "morph:blue_parrot",
    entity: "minecraft:parrot",
    type: 42,
    conditions: "this.getComponent('minecraft:variant').value == 1"
  },
  {
    id: "morph:green_parrot",
    entity: "minecraft:parrot",
    type: 42,
    conditions: "this.getComponent('minecraft:variant').value == 2"
  },
  {
    id: "morph:cyan_parrot",
    entity: "minecraft:parrot",
    type: 42,
    conditions: "this.getComponent('minecraft:variant').value == 3"
  },
  {
    id: "morph:silver_parrot",
    entity: "minecraft:parrot",
    type: 42,
    conditions: "this.getComponent('minecraft:variant').value == 4"
  },
  {
    id: "morph:large_slime",
    entity: "minecraft:slime",
    type: 43,
    conditions: "this.getComponent('minecraft:variant').value == 4"
  },
  {
    id: "morph:medium_slime",
    entity: "minecraft:slime",
    type: 43,
    conditions: "this.getComponent('minecraft:variant').value == 2"
  },
  {
    id: "morph:small_slime",
    entity: "minecraft:slime",
    type: 43,
    conditions: "this.getComponent('minecraft:variant').value == 1"
  },
  {
    id: "morph:strider",
    entity: "minecraft:strider",
    type: 44,
    conditions: "!this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_saddled')"
  },
  {
    id: "morph:baby_strider",
    entity: "minecraft:strider",
    type: 44,
    conditions: "this.getComponent('minecraft:is_baby') && !this.getComponent('minecraft:is_saddled')"
  },
  {
    id: "morph:saddled_strider",
    entity: "minecraft:strider",
    type: 44,
    conditions: "!this.getComponent('minecraft:is_baby') && this.getComponent('minecraft:is_saddled')"
  },
  {
    id: "morph:vex",
    entity: "minecraft:vex",
    type: 45
  },
  {
    id: "morph:turtle",
    entity: "minecraft:turtle",
    type: 46,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_turtle",
    entity: "minecraft:turtle",
    type: 46,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:witch",
    entity: "minecraft:witch",
    type: 47
  },
  {
    id: "morph:brown_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && (!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_brown_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && (!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:splotched_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_splotched_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:desert_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_desert_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:salt_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 5 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_salt_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag != 'Toast' : true) && this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:toast_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag == 'Toast' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 6 : null)) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_toast_rabbit",
    entity: "minecraft:rabbit",
    type: 48,
    conditions: "(this.typeId == 'minecraft:rabbit' ? this.nameTag == 'Toast' : (this.typeId == 'minecraft:player' ? this.getComponent('minecraft:variant').value == 6 : null)) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:ghast",
    entity: "minecraft:ghast",
    type: 49
  },
  {
    id: "morph:glow_squid",
    entity: "minecraft:glow_squid",
    type: 50,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_glow_squid",
    entity: "minecraft:glow_squid",
    type: 50,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:phantom",
    entity: "minecraft:phantom",
    type: 51
  },
  {
    id: "morph:polar_bear",
    entity: "minecraft:polar_bear",
    type: 52,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_polar_bear",
    entity: "minecraft:polar_bear",
    type: 52,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:large_magma_cube",
    entity: "minecraft:magma_cube",
    type: 53,
    conditions: "this.getComponent('minecraft:variant').value == 4"
  },
  {
    id: "morph:medium_magma_cube",
    entity: "minecraft:magma_cube",
    type: 53,
    conditions: "this.getComponent('minecraft:variant').value == 2"
  },
  {
    id: "morph:small_magma_cube",
    entity: "minecraft:magma_cube",
    type: 53,
    conditions: "this.getComponent('minecraft:variant').value == 1"
  },
  {
    id: "morph:allay",
    entity: "minecraft:allay",
    type: 54
  },
  {
    id: "morph:ravager",
    entity: "minecraft:ravager",
    type: 55
  },
  {
    id: "morph:temperate_frog",
    entity: "minecraft:frog",
    type: 56,
    conditions: "!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0"
  },
  {
    id: "morph:cold_frog",
    entity: "minecraft:frog",
    type: 56,
    conditions: "this.getComponent('minecraft:variant').value == 1"
  },
  {
    id: "morph:warm_frog",
    entity: "minecraft:frog",
    type: 56,
    conditions: "this.getComponent('minecraft:variant').value == 2"
  },
  {
    id: "morph:evoker",
    entity: "minecraft:evocation_illager",
    type: 57
  },
  {
    id: "morph:tadpole",
    entity: "minecraft:tadpole",
    type: 58
  },
  {
    id: "morph:endermite",
    entity: "minecraft:endermite",
    type: 59
  },
  {
    id: "morph:wandering_trader",
    entity: "minecraft:wandering_trader",
    type: 60
  },
  {
    id: "morph:silverfish",
    entity: "minecraft:silverfish",
    type: 61
  },
  {
    id: "morph:creamy_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_creamy_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:brown_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_brown_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:gray_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_gray_trader_llama",
    entity: "minecraft:trader_llama",
    type: 62,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:guardian",
    entity: "minecraft:guardian",
    type: 63
  },
  {
    id: "morph:panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:lazy_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_lazy_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:worried_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_worried_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:playful_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_playful_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:brown_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_brown_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:weak_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 5 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_weak_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:aggressive_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 6 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_aggressive_panda",
    entity: "minecraft:panda",
    type: 64,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:elder_guardian",
    entity: "minecraft:elder_guardian",
    type: 65
  },
  {
    id: "morph:anemone",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 7"
  },
  {
    id: "morph:black_tang",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 7 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 7"
  },
  {
    id: "morph:blue_dory",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 7 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 3"
  },
  {
    id: "morph:butterfly_fish",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 4 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 7"
  },
  {
    id: "morph:cichlid",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 11 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 7"
  },
  {
    id: "morph:clownfish",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 0"
  },
  {
    id: "morph:cotton_candy_betta",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 5 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 6 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 3"
  },
  {
    id: "morph:dottyback",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 3 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 10 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 4"
  },
  {
    id: "morph:emperor_red_snapper",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 5 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 14"
  },
  {
    id: "morph:goatfish",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 5 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 4"
  },
  {
    id: "morph:moorish_idol",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 2 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 7"
  },
  {
    id: "morph:ornate_butterfly",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 5 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 1"
  },
  {
    id: "morph:parrotfish",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 3 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 9 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 6"
  },
  {
    id: "morph:queen_angel_fish",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 4 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 5 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 3"
  },
  {
    id: "morph:red_cichlid",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 4 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 14 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 0"
  },
  {
    id: "morph:red_lipped_blenny",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 2 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 7 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 14"
  },
  {
    id: "morph:red_snapper",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 3 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 14 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 0"
  },
  {
    id: "morph:threadfin",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 0 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 4"
  },
  {
    id: "morph:tomato_clown",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 14 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 0"
  },
  {
    id: "morph:triggerfish",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 7 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 0"
  },
  {
    id: "morph:yellow_tang",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 1 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 4 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 4"
  },
  {
    id: "morph:yellowtail_parrot",
    entity: "minecraft:tropicalfish",
    type: 66,
    conditions: "this.getComponent('minecraft:variant').value == 0 && this.getComponent('minecraft:mark_variant').value == 3 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color.value' }]) == 9 && getComponentByEntity(this, [{ entity: 'minecraft:player', property: 'morph:color2' }, { entity: 'minecraft:tropicalfish', component: 'minecraft:color2.value' }]) == 4"
  },
  {
    id: "morph:shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 16"
  },
  {
    id: "morph:white_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 15"
  },
  {
    id: "morph:orange_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 14"
  },
  {
    id: "morph:magenta_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 13"
  },
  {
    id: "morph:light_blue_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 12"
  },
  {
    id: "morph:yellow_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 11"
  },
  {
    id: "morph:lime_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 10"
  },
  {
    id: "morph:pink_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 9"
  },
  {
    id: "morph:gray_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 8"
  },
  {
    id: "morph:light_gray_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 7"
  },
  {
    id: "morph:cyan_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 6"
  },
  {
    id: "morph:purple_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 5"
  },
  {
    id: "morph:blue_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 4"
  },
  {
    id: "morph:brown_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 3"
  },
  {
    id: "morph:green_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 2"
  },
  {
    id: "morph:red_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "this.getComponent('minecraft:variant').value == 1"
  },
  {
    id: "morph:black_shulker",
    entity: "minecraft:shulker",
    type: 67,
    conditions: "!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0"
  },
  {
    id: "morph:sniffer",
    entity: "minecraft:sniffer",
    type: 68,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_sniffer",
    entity: "minecraft:sniffer",
    type: 68,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:warden",
    entity: "minecraft:warden",
    type: 69
  },
  {
    id: "morph:pufferfish",
    entity: "minecraft:pufferfish",
    type: 70
  },
  {
    id: "morph:white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_white_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "(!this.getComponent('minecraft:variant') || this.getComponent('minecraft:variant').value == 0) && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_creamy_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 1 && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_chestnut_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 2 && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 3 && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_black_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 4 && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_gray_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 5 && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && (!this.getComponent('minecraft:mark_variant') || this.getComponent('minecraft:mark_variant').value == 0) && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_details_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 1 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_details_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 1 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_fields_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 2 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_fields_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 2 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:white_dots_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 3 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_white_dots_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 3 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:black_dots_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 4 && !this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_black_dots_dark_brown_horse",
    entity: "minecraft:horse",
    type: 71,
    conditions: "this.getComponent('minecraft:variant').value == 6 && this.getComponent('minecraft:mark_variant').value == 4 && this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:donkey",
    entity: "minecraft:donkey",
    type: 72,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_donkey",
    entity: "minecraft:donkey",
    type: 72,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:mule",
    entity: "minecraft:mule",
    type: 73,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_mule",
    entity: "minecraft:mule",
    type: 73,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:skeleton_horse",
    entity: "minecraft:skeleton_horse",
    type: 74,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_skeleton_horse",
    entity: "minecraft:skeleton_horse",
    type: 74,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:zombie_horse",
    entity: "minecraft:zombie_horse",
    type: 75,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_zombie_horse",
    entity: "minecraft:zombie_horse",
    type: 75,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:camel",
    entity: "minecraft:camel",
    type: 76,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_camel",
    entity: "minecraft:camel",
    type: 76,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:ender_dragon",
    entity: "minecraft:ender_dragon",
    type: 77
  },
  {
    id: "morph:armadillo",
    entity: "minecraft:armadillo",
    type: 78,
    conditions: "!this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:baby_armadillo",
    entity: "minecraft:armadillo",
    type: 78,
    conditions: "this.getComponent('minecraft:is_baby')"
  },
  {
    id: "morph:bogged",
    entity: "minecraft:bogged",
    type: 79,
    conditions: "!this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:sheared_bogged",
    entity: "minecraft:bogged",
    type: 79,
    conditions: "this.getComponent('minecraft:is_sheared')"
  },
  {
    id: "morph:breeze",
    entity: "minecraft:breeze",
    type: 80
  }
];

export const sounds = [
  {
    type: 0,
    hurt: [
      { conditions: "damageSource.cause != 'drowning' && damageSource.cause != 'fire' && damageSource.cause != 'fireTick' && damageSource.cause != 'freezing'", sound: "game.player.hurt" },
      { conditions: "damageSource.cause == 'drowning'", sound: "mob.player.hurt_drown", pitch: 1.0 },
      { conditions: "damageSource.cause == 'fire' || damageSource.cause == 'fireTick'", sound: "mob.player.hurt_on_fire", pitch: 1.0 },
      { conditions: "damageSource.cause == 'freezing'", sound: "mob.player.hurt_freeze", pitch: 1.0 }
    ],
    death: "game.player.die",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 1,
    hurt: "mob.zombie.hurt",
    death: "mob.zombie.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 2,
    hurt: "mob.cow.hurt",
    death: "mob.cow.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 3,
    hurt: {
      sound: "mob.skeleton.hurt",
      volume: 0.70
    },
    death: "mob.skeleton.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 4,
    hurt: "mob.chicken.hurt",
    death: "mob.chicken.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 5,
    hurt: "mob.creeper.say",
    death: "mob.creeper.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 6,
    hurt: "mob.sheep.say",
    death: "mob.sheep.say",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 7,
    hurt: "mob.spider.say",
    death: "mob.spider.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 8,
    hurt: "mob.pig.say",
    death: "mob.pig.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 9,
    hurt: "mob.endermen.hit",
    death: "mob.endermen.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 10,
    hurt: "mob.bat.hurt",
    death: "mob.bat.death",
    volume: 0.10,
    pitch: [ 0.76, 1.14 ]
  },
  {
    type: 11,
    hurt: "mob.zombiepig.zpighurt",
    death: "mob.zombiepig.zpigdeath",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 12,
    hurt: "mob.fox.hurt",
    death: "mob.fox.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 13,
    hurt: "mob.drowned.hurt",
    death: "mob.drowned.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 14,
    hurt: "mob.villager.hit",
    death: "mob.villager.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 15,
    hurt: "entity.wither_skeleton.hurt",
    death: "entity.wither_skeleton.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 16,
    hurt: "mob.snowgolem.hurt",
    death: "mob.snowgolem.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 17,
    hurt: "mob.blaze.hit",
    death: "mob.blaze.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 18,
    hurt: {
      sound: "mob.cat.hit",
      volume: 0.45
    },
    death: {
      sound: "mob.cat.hit",
      volume: 0.50,
      pitch: 0.90
    },
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 19,
    hurt: "mob.husk.hurt",
    death: "mob.husk.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 20,
    hurt: "mob.wolf.hurt",
    death: "mob.wolf.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 21,
    hurt: "mob.piglin.hurt",
    death: "mob.piglin.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 22,
    hurt: "mob.fish.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 23,
    hurt: "mob.irongolem.hit",
    death: "mob.irongolem.death",
    volume: 1.0,
    pitch: [ 0.80, 1.0 ]
  },
  {
    type: 24,
    hurt: "mob.axolotl.hurt",
    death: "mob.axolotl.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 25,
    hurt: "mob.stray.hurt",
    death: "mob.stray.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 26,
    hurt: {
      sound: "mob.cat.hit",
      volume: 0.45
    },
    death: "mob.ocelot.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 27,
    hurt: "mob.vindicator.hurt",
    death: "mob.vindicator.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 28,
    hurt: "mob.fish.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 29,
    hurt: "mob.hoglin.hurt",
    death: "mob.hoglin.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 30,
    hurt: "mob.squid.hurt",
    death: "mob.squid.death",
    volume: 0.40,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 31,
    hurt: "mob.piglin_brute.hurt",
    death: "mob.piglin_brute.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 32,
    hurt: "mob.llama.hurt",
    death: "mob.llama.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 33,
    hurt: "mob.spider.say",
    death: "mob.spider.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 34,
    hurt: "mob.cow.hurt",
    death: "mob.cow.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 35,
    hurt: "mob.zombie_villager.hurt",
    death: "mob.zombie_villager.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 36,
    hurt: [
      { conditions: "this.getComponent('minecraft:variant').value == 0", sound: "mob.goat.hurt" },
      { conditions: "this.getComponent('minecraft:variant').value == 1", sound: "mob.goat.hurt.screamer" }
    ],
    death: [
      { conditions: "this.getComponent('minecraft:variant').value == 0", sound: "mob.goat.death" },
      { conditions: "this.getComponent('minecraft:variant').value == 1", sound: "mob.goat.death.screamer" }
    ],
    volume: 1,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 37,
    hurt: "mob.wither.hurt",
    death: "mob.wither.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 38,
    hurt: "mob.dolphin.hurt",
    death: "mob.dolphin.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 39,
    hurt: "mob.zoglin.hurt",
    death: "mob.zoglin.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 40,
    hurt: {
      sound: "mob.bee.hurt",
      volume: 0.60,
      pitch: [ 0.90, 1.10 ]
    },
    death: {
      sound: "mob.bee.death",
      volume: 0.60,
      pitch: [ 0.90, 1.10 ]
    },
    volume: 0.60,
    pitch: 1.0
  },
  {
    type: 41,
    hurt: "mob.pillager.hurt",
    death: "mob.pillager.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 42,
    hurt: {
      sound: "mob.parrot.hurt",
      volume: 1.0,
      pitch: [ 0.80, 1.0 ]
    },
    death: {
      sound: "mob.parrot.death",
      volume: 1.0,
      pitch: [ 0.80, 1.0 ]
    },
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 43,
    hurt: "mob.slime.small",
    death: "mob.slime.small",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 44,
    hurt: "mob.strider.hurt",
    death: "mob.strider.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 45,
    hurt: "mob.vex.hurt",
    death: "mob.vex.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 46,
    hurt: [
      { conditions: "!this.getComponent('minecraft:is_baby')", sound: "mob.turtle.hurt" },
      { conditions: "this.getComponent('minecraft:is_baby')", sound: "mob.turtle_baby.hurt" }
    ],
    death: [
      { conditions: "!this.getComponent('minecraft:is_baby')", sound: "mob.turtle.death" },
      { conditions: "this.getComponent('minecraft:is_baby')", sound: "mob.turtle_baby.death" }
    ],
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 47,
    hurt: "mob.witch.hurt",
    death: "mob.witch.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 48,
    hurt: "mob.rabbit.hurt",
    death: "mob.rabbit.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 49,
    hurt: "mob.ghast.scream",
    death: "mob.ghast.death",
    volume: 5.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 50,
    hurt: "mob.glow_squid.hurt",
    death: "mob.glow_squid.death",
    volume: 0.40,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 51,
    hurt: "mob.phantom.hurt",
    death: "mob.phantom.death",
    volume: 10.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 52,
    hurt: {
      sound: "mob.polarbear.hurt",
      volume: 0.70
    },
    death: "mob.polarbear.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 53,
    hurt: "mob.magmacube.small",
    death: "mob.magmacube.small",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 54,
    hurt: "mob.allay.hurt",
    death: "mob.allay.death",
    volume: 1,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 55,
    hurt: "mob.ravager.hurt",
    death: "mob.ravager.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 56,
    hurt: "mob.frog.hurt",
    death: "mob.frog.death",
    volume: 1,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 57,
    hurt: "mob.evocation_illager.hurt",
    death: "mob.evocation_illager.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 58,
    hurt: "mob.tadpole.hurt",
    death: "mob.tadpole.death",
    volume: 1,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 59,
    hurt: "mob.endermite.hit",
    death: "mob.endermite.kill",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 60,
    hurt: "mob.wanderingtrader.hurt",
    death: "mob.wanderingtrader.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 61,
    hurt: "mob.silverfish.hit",
    death: "mob.silverfish.kill",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 62,
    hurt: "mob.llama.hurt",
    death: "mob.llama.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 63,
    hurt: [
      { conditions: "!this.isInWater", sound: "mob.guardian.land_hit" },
      { conditions: "this.isInWater", sound: "mob.guardian.hit" }
    ],
    death: [
      { conditions: "!this.isInWater", sound: "mob.guardian.land_death" },
      { conditions: "this.isInWater", sound: "mob.guardian.death" }
    ],
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 64,
    hurt: "mob.panda.hurt",
    death: "mob.panda.death",
    volume: 0.820,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 65,
    hurt: [
      { conditions: "!this.isInWater", sound: "mob.guardian.land_hit" },
      { conditions: "this.isInWater", sound: "mob.elderguardian.hit" }
    ],
    death: "mob.elderguardian.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 66,
    hurt: "mob.fish.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 67,
    hurt: "mob.shulker.hurt",
    death: "mob.shulker.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 68,
    hurt: "mob.sniffer.hurt",
    death: "mob.sniffer.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 69,
    hurt: "mob.warden.hurt",
    death: "mob.warden.death",
    volume: 1.0,
    pitch: [ 0.80, 1.0 ]
  },
  {
    type: 70,
    hurt: "mob.fish.hurt",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 71,
    hurt: "mob.horse.hit",
    death: "mob.horse.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 72,
    hurt: "mob.horse.donkey.hit",
    death: "mob.horse.donkey.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 73,
    hurt: "mob.horse.donkey.hit",
    death: "mob.horse.donkey.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 74,
    hurt: "mob.horse.skeleton.hit",
    death: "mob.horse.skeleton.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 75,
    hurt: "mob.horse.zombie.hit",
    death: "mob.horse.zombie.death",
    volume: 0.80,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 76,
    hurt: "mob.camel.hurt",
    death: "mob.camel.death",
    volume: 1.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 77,
    hurt: "mob.enderdragon.hit",
    death: "mob.enderdragon.death",
    volume: 80.0,
    pitch: [ 0.80, 1.20 ]
  },
  {
    type: 78,
    hurt: [
      { conditions: "this.getProperty('morph:armadillo_state') == 'unrolled'", sound: "mob.armadillo.hurt" },
      { conditions: "this.getProperty('morph:armadillo_state') == 'rolled_up'", sound: "mob.armadillo.hurt_reduced" }
    ],
    death: "mob.armadillo.death",
    volume: 1.0,
    pitch: [ 0.8, 1.2 ]
  },
  {
    type: 79,
    hurt: "mob.bogged.hurt",
    death: "mob.bogged.death",
    volume: 1.0,
    pitch: [ 0.8, 1.2 ]
  },
  {
    type: 80,
    hurt: "mob.breeze.hurt",
    death: "mob.breeze.death",
    volume: 1.0,
    pitch: 1.0
  }
];