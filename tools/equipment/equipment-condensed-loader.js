
var equipment = {};
for (i in equipment_condensed)
{
    var ud = {};
    var e = equipment_condensed[i];

    ud.gunrange = e[0];
    ud.icon = e[1];
    ud.cost= e[2];
    ud.initiative = e[3];
    ud.spotrange = e[4];
    ud.bombercode = e[5];
    ud.hardatk = e[6];
    ud.id = e[7];
    ud.softatk = e[8];
    ud.airdef = e[9];
    ud.fuel = e[10];
    ud.rangedefmod = e[11];
    ud.airatk = e[12];
    ud.movmethod = e[13];
    ud.navalatk = e[14];
    ud.movpoints = e[15];
    ud.grounddef = e[16];
    ud.class = e[17];
    ud.target = e[18];
    ud.name = e[19];
    ud.country = e[20];
    ud.closedef = e[21];
    ud.ammo = e[22];

    equipment[ud.id] = ud;
}
