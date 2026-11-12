'use strict';
/* FRC Manager — extras for the local copy (opened from index.html): download a save as a .json file. */
(function () {
  G.Save.exportFile = function () {
    if (!G.S) return;
    const blob = new Blob([G.Save.exportText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'frc-manager-' + (G.S.team ? G.S.team.num : 'save') + '-' + (G.Career.calYear(G.S) || G.S.year) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
})();
