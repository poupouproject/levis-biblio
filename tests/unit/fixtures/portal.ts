// Fixtures synthétiques : même structure HTML que le portail SirsiDynix de Lévis, données fictives.

const CSRF = '11111111-2222-3333-4444-555555555555';

export const checkoutsZoneHtml = `
<div class="checkoutsSummary">Total des documents empruntés : 2<br>Documents en retard : 1</div>
<form id="form_abc123" method="post" action="/client/fr_CA/accueil/search/account.accountnonmobile.checkouts.checkoutslistnonmobile.form/0?&amp;sdcsrf=${CSRF}">
  <div class="t-invisible"><input value="${CSRF}" name="sdcsrf" type="hidden"><input value="OPAQUE==" name="t:formdata" type="hidden"></div>
  <table id="myCheckouts_checkoutslistnonmobile_table" class="checkoutsList sortable">
    <thead><tr><th class="checkoutsAlert"></th><th></th><th>Titre / auteur</th><th>Nombre de renouvellements</th><th>Date de retour</th></tr></thead>
    <tbody>
      <tr>
        <td class="checkoutsAlert">En retard</td>
        <td class="checkoutsCoverArt"><input class="checkoutsCheckbox" id="checkbox_x" name="checkbox" type="checkbox">
          <div id="checkoutInitialCover_990300000001" class="myAccountCoverArt"></div></td>
        <td class="checkoutsBookInfo"><div><a onclick="return checkBeforeLoadingDetail('detailZone0','/client/fr_CA/accueil/search/account.accountnonmobile.checkouts.checkoutslistnonmobile.detaillink:detailclick/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:111111/0/Titre?d=x');" title="Le livre fictif. 2, La suite" href="#">Le livre fictif. 2, La suite</a></div>
          <div class="checkouts_author">Auteur, Imaginaire, 1970-</div>
          <div class="callNumber"><span class="label">Numéro de cote topographique &nbsp;: </span><span class="fieldValue checkouts_callNumber">J R123 liv v.2</span></div></td>
        <td class="checkoutsRenewCount">1</td>
        <td class="checkoutsDueDate">26-10-05</td>
      </tr>
      <tr>
        <td class="checkoutsAlert"></td>
        <td class="checkoutsCoverArt"><input class="checkoutsCheckbox" id="checkbox_y" name="checkbox_0" type="checkbox">
          <div id="checkoutInitialCover_990300000002" class="myAccountCoverArt"></div></td>
        <td class="checkoutsBookInfo"><div><a onclick="return checkBeforeLoadingDetail('detailZone1','/client/fr_CA/accueil/search/account.accountnonmobile.checkouts.checkoutslistnonmobile.detaillink:detailclick/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:222222/1/Autre?d=x');" title="Une bande dessinée" href="#">Une bande dessinée</a></div>
          <div class="checkouts_author">Dessinateur, Fictif</div></td>
        <td class="checkoutsRenewCount">0</td>
        <td class="checkoutsDueDate">26-10-31</td>
      </tr>
    </tbody>
  </table>
  <div id="myCheckouts_checkoutslistnonmobile_submit_holder"><input class="hidden" id="myCheckouts_checkoutslist_submit" name="myCheckouts_checkoutslist_submit" type="submit" value="submit"></div>
</form>`;

export const holdsZoneHtml = `
<div>Documents réservés : 3<br>Prêt pour le retrait : 1</div>
<form id="HoldsSelectionForm_abc" method="post" action="/client/fr_CA/accueil/search/account.accountnonmobile.holds.holdslistnonmobile.holdsselectionform/0?&amp;sdcsrf=${CSRF}">
  <div class="t-invisible"><input value="${CSRF}" name="sdcsrf" type="hidden"><input value="OPAQUE2==" name="t:formdata" type="hidden"></div>
  <div id="myHolds_holdslistnonmobile_ids_holder"><input class="hidden" name="myHolds_holdslistnonmobile_ids" type="text"></div>
  <div id="myHolds_holdslistnonmobile_action_holder"><input class="hidden" name="myHolds_holdslistnonmobile_action" type="text"></div>
  <table id="myHolds_holdslistnonmobile_table" class="holdsList sortable"><tbody>
    <tr>
      <td class="holdsAlert"></td>
      <td class="holdsCoverArt"><input type="checkbox" class="listItem holdsCheckbox ils readyHoldsCheckbox" value="ent://SD_ILS/0/SD_ILS:333333|4000001" alt="Prêt à partir"></td>
      <td class="holdsID"><a onclick="return checkBeforeLoadingDetail('detailZone4','/x/detailclick/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:333333/4/T');" title="Prêt à partir" href="#">Prêt à partir</a><div class="holds_author">Auteure, Exemple</div></td>
      <td class="holdsStatus">Prêt pour le retrait</td>
      <td class="holdsPickup">Jean-Gosselin (Charny)</td>
      <td class="holdsDate">26-10-15</td>
      <td class="holdsRank"></td>
    </tr>
    <tr>
      <td class="holdsAlert"></td>
      <td class="holdsCoverArt"><input type="checkbox" class="listItem holdsCheckbox ils" value="ent://SD_ILS/0/SD_ILS:444444|4000002" alt="Dans la file"></td>
      <td class="holdsID"><a onclick="x" title="Dans la file" href="#">Dans la file</a><div class="callNumber"><span class="fieldValue holds_callNumber">J BD X1</span></div></td>
      <td class="holdsStatus">En attente</td>
      <td class="holdsPickup">Anne-Marie-Filteau (St-Nicolas)</td>
      <td class="holdsDate"></td>
      <td class="holdsRank">3</td>
    </tr>
    <tr>
      <td class="holdsAlert"></td>
      <td class="holdsCoverArt"><input type="checkbox" class="listItem holdsCheckbox ils" value="ent://SD_ILS/0/SD_ILS:555555|4000003" alt="En pause"></td>
      <td class="holdsID"><a onclick="x" title="En pause" href="#">En pause</a></td>
      <td class="holdsStatus">Suspendue</td>
      <td class="holdsPickup">Succursale inconnue</td>
      <td class="holdsDate">26-12-01</td>
      <td class="holdsRank">1</td>
    </tr>
  </tbody></table>
  <input class="hidden" id="myHolds_holdslist_submit" name="myHolds_holdslist_submit" type="submit" value="submit">
</form>`;

export const holdsScripts = `makeSortable(x);new HoldsList('myHolds_holdslistnonmobile',false,false,'holdsCheckbox ils','https://levi.ent.sirsidynix.net/client/fr_CA/accueil/search/account.accountnonmobile.holds.holdslistnonmobile:editpickuplibraries/https:$002f$002flevi$002f2$002f0$003f?&sdcsrf=${CSRF}','placeHoldZone','null',false,{"ent://SD_ILS/0/SD_ILS:333333|4000001":"4000001|null","ent://SD_ILS/0/SD_ILS:444444|4000002":"4000002|null"});`;

export const historyZoneHtml = `
<table id="checkoutsHistoryList_table"><thead><tr><th>Titre</th><th>Auteur</th><th>Emprunté</th><th>Retourné</th></tr></thead><tbody>
  <tr><td class="checkoutsHistoryBookInfo">Ancien livre</td><td class="checkoutsHistoryCheckoutDates">Vieil, Auteur</td><td class="checkoutsHistoryCheckoutDates">23-03-23</td><td class="checkoutsHistoryCheckoutDates">23-04-13</td></tr>
  <tr><td class="checkoutsHistoryBookInfo">Livre récent</td><td class="checkoutsHistoryCheckoutDates"></td><td class="checkoutsHistoryCheckoutDates">25-01-21</td><td class="checkoutsHistoryCheckoutDates">25-02-15</td></tr>
</tbody></table>`;

export const finesZoneHtml = `
<div id='finesAccordion'><h3><a href='#'>Amendes/blocages en cours</a></h3>
<div>Amendes/blocages en cours : 2 Montant total à payer : 3,50 $</div>
<table id="finesTable_personal0"><thead><tr><th>Titre</th><th>Raison</th><th>Montant</th></tr></thead>
<tbody><tr><td>Le livre fictif</td><td>Retard</td><td>3,50 $</td></tr></tbody></table>
<h3>Amendes accumulées</h3><div>Amendes / Blocages accumulés : 1</div>
<h3>historique de paiements</h3><div>Total payé: 12,25 $</div></div>`;

/** « test@exemple.ca » encodé à la manière de Cloudflare (clé 0x42). */
export const CF_EMAIL = '423627313602273a272f322e276c2123';

export const accountPageHtml = `
<html><head><script>var __sdcsrf = "${CSRF}";</script></head><body>
<div id="preferencesTab"><div id="accountInfo"><div id="preferencesAccordion"><h3><a href="#">Tremblay, Marie</a></h3>
<div id="addressAccordion"><div class="address_wrapper">
  <div class="address_row field"><div class="address_identifier">Rue:</div><div class="address_value">123 rue Fictive</div></div>
  <div class="address_row field"><div class="address_identifier">Ville/Prov.:</div><div class="address_value">Lévis, QC</div></div>
  <div class="address_row field"><div class="address_identifier">Code postal:</div><div class="address_value">G6V 0A0</div></div>
  <div class="address_row field"><div class="address_identifier">N° de téléphone (domicile):</div><div class="address_value">418-555-0000</div></div>
  <div class="address_row field"><div class="address_identifier">Courrier électronique:</div><div class="address_value"><a class="__cf_email__" data-cfemail="${CF_EMAIL}">[email protected]</a></div></div>
</div></div></div></div></div>
<form id="preferencesForm" method="post" action="/client/fr_CA/accueil/search/account.accountnonmobile.personalinfo.preferencesnonmobile.preferencesform?&amp;sdcsrf=${CSRF}">
  <div class="t-invisible"><input value="${CSRF}" name="sdcsrf" type="hidden"><input value="OPAQUE3==" name="t:formdata" type="hidden"></div>
  <select name="defaultLanguage"><option selected="selected" value="fr_CA">français</option><option value="en_US">English</option></select>
  <select name="defaultTab"><option value="PERSONAL">Infos</option><option selected="selected" value="CHECKOUTS">Emprunts</option></select>
  <select name="pickupLibrary"><option value="AMF">Anne-Marie-Filteau (St-Nicolas)</option><option selected="selected" value="JG">Jean-Gosselin (Charny)</option></select>
  <input type="checkbox" name="showCheckoutHistory" checked="checked">
  <input type="submit" name="updatePrefs" id="updatePrefs" value="Mise à jour">
</form>
</body></html>`;
