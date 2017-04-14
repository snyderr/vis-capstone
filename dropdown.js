$(document).ready(function () {
  $('#countrySelector').multiselect({
    enableClickableOptGroups: true,
    enableCollapsibleOptGroups: true,
    enableFiltering: true,
    includeSelectAllOption: true,
    onChange: function (element, checked) {

      if (checked === true) {
        //action taken here if true
        selectedCountries.push(element.val);
      }
      else if (checked === false) {
        selectedCountries.remove(element.val);
      }

      if (dataLoaded) {
        updateBarChart();
        updatePieCountry();
      }
    }
  });
  $('#emissionTypeSelector').multiselect({
    includeSelectAllOption: true,
    onChange: function (element, checked) {
      if (checked === true) {
        //action taken here if true
        console.log(element.val());
        selectedEmissionTypes.push(element.val);
      }
      else if (checked === false) {
        selectedEmissionTypes.remove(element.val);
      }

      if (dataLoaded) {
        updateBarChart();
        updatePieCountry();
      }
    }

  });
  $('#sectorSelector').multiselect({
    includeSelectAllOption: true,
    onChange: function (element, checked) {
      if (checked === true) {
        //action taken here if true
        console.log(element.val());
        selectedSectors.push(element.value);
      }
      else if (checked === false) {
        selectedSectors.remove(element.value);
      }

      if (dataLoaded) {
        updateBarChart();
        updatePieCountry();
      }
    }
  });

});