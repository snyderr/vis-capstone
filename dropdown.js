$(document).ready(function() {
  $('#countrySelector').multiselect({
    enableClickableOptGroups: true,
    enableCollapsibleOptGroups: true,
    enableFiltering: true,
    includeSelectAllOption: true,
    onChange: function(element, checked) {
      if (checked === true) {
        //action taken here if true
        console.log(element.val());
      }
      else if (checked === false) {
        if (true) {
          //action taken here
          //confirm('Do you wish to deselect the element?')
        }
        else {
          $("#countrySelector").multiselect('select', element.val()); //deselect
        }
      }
    }
  });
  $('#emissionTypeSelector').multiselect({
    includeSelectAllOption: true
  });
  $('#sectorSelector').multiselect({
    includeSelectAllOption: true
  });

});