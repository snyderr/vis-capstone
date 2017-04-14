var holder = d3.select("body").append("div");
var svg = holder.append("svg").attr("class", "mapSvg").attr("width", "100%").attr("height", "100%");

var selectorContainer = holder.append("div").attr("class", "titleContainer");
selectorContainer.append("h1").style("padding", "10px").html("World Emissions Data by Sector");
var selectorAndInfo = selectorContainer.append("div").attr("class", "selectorAndInfo");
selectorAndInfo.append("h2").html("Countries");
var countrySelector = selectorAndInfo.append("select").attr("class", "selector").attr("id", "countrySelector")
                                     .attr("multiple", "multiple");
selectorAndInfo = selectorContainer.append("div").attr("class", "selectorAndInfo");
selectorAndInfo.append("h2").html("Emission Type");
var emissionTypeSelector = selectorAndInfo.append("select").attr("class", "selector")
                                          .attr("id", "emissionTypeSelector").attr("multiple", "multiple");
selectorAndInfo = selectorContainer.append("div").attr("class", "selectorAndInfo");
selectorAndInfo.append("h2").html("Sector");
var sectorSelector = selectorAndInfo.append("select").attr("class", "selector").attr("id", "sectorSelector")
                                    .attr("multiple", "multiple");

var pieAndSvgHolder = holder.append("div").attr("class", "chartsHolder").attr("width", "500px").attr("height", "100%");
pieAndSvgHolder.append("h2").html("Sectors");
var barSVG = pieAndSvgHolder.append('svg').attr("class", "barSVG").attr('width', "500px").attr('height', "320px")
                            .append('g')
                            .attr('transform', 'translate(' + 40 + ',' + 20 + ')');
pieAndSvgHolder.append("h2").html("Emission Type");
var pieSVG = pieAndSvgHolder.append('svg').attr("class", "pieSVG").attr('width', "400px").attr('height', "320px")
                            .append('g')
                            .attr('transform', 'translate(' + 160 + ',' + 160 + ')');

var tooltip = holder.append('div').attr('class', 'tooltip').style('display', 'none');

var timeSliderContainer = holder.append("div").attr("class", "timeSliderContainer");
var sliderInput = timeSliderContainer.append("div").attr("id", "slider");
var selectedYears = [1996, 2004];
var selectedCountries = [];
var selectedEmissionTypes = [];
var selectedSectors = [];
noUiSlider.create(sliderInput.node(), {
  start: selectedYears,
  tooltips: [wNumb({decimals: 0}), wNumb({decimals: 0})],
  connect: [false, true, false],
  step: 1,
  range: {
    'min': [1990],
    'max': [2016]
  }
})
;
sliderInput.node().noUiSlider.on('update', function (values, handle) {
  selectedYears[0] = +values[0];
  selectedYears[1] = +values[1];
  if (dataLoaded) {
    updateBarChart();
    updatePieCountry();
  }

});
var svgGroup = svg.append("g");
var width = parseInt(svg.style('width'));
var height = parseInt(svg.style('height'));
var projection = d3.geoEquirectangular().scale(300).center([20, 0]).translate([width / 2, height / 2]);
var path = d3.geoPath().projection(projection);
var slider, colorScale;

//Pie chart
width = 320;
height = 320;
var radius = Math.min(width, height) / 2;
var donutWidth = 75;
var legendRectSize = 18;
var legendSpacing = 4;
var color = d3.scaleOrdinal(d3.schemeCategory20);
var arc = d3.arc().innerRadius(radius - donutWidth).outerRadius(radius);
var pie, piePath;

d3.queue()
  .defer(d3.json, "countries.geo.json")
  .defer(d3.csv, "FAOSTAT_data_4-12-2017.csv")
  .defer(d3.json, "countryContinentLookup.json")
  .await(drawMap);

function initializeSelectors(countryContinentLookup, emissions) {
  var allContinents = Object.values(countryContinentLookup).filter(function (e, i, arr) {
    return arr.lastIndexOf(e) === i;
  });
  var allCountries = Object.keys(countryContinentLookup);

  var optgroups = [];
  allContinents.forEach(function (d) {
    var countriesOfContinents = allCountries.reduce(function (a, b) {
      if (countryContinentLookup[b] === d) {
        a.push({label: b, value: b, selected: true})
      }
      return a;
    }, []);
    optgroups.push({
      label: d,
      children: countriesOfContinents
    });
  });
  $('#countrySelector').multiselect('dataprovider', optgroups);

  var allEmissionTypes = emissions.reduce(function (a, b) {
    if (!a.includes(b.Element)) {
      a.push(b.Element);
    }
    return a;
  }, []).splice(1);
  optgroups = [];
  allEmissionTypes.forEach(function (d) {
    optgroups.push({
      label: d, value: d, selected: true
    });
  });
  $('#emissionTypeSelector').multiselect('dataprovider', optgroups);

  optgroups = [];
  var allSectors = emissions.reduce(function (a, b) {
    var name = b.Item.split(" ")[0].replace(/,/g, "");
    if (!a.includes(name)) {
      optgroups.push({
        label: name, value: b.Item, selected: true
      });
      a.push(name);
      selectedSectors.push(b.Item);
    }
    return a;
  }, []);

  $('#sectorSelector').multiselect('dataprovider', optgroups);

  selectedCountries = allCountries;
  selectedEmissionTypes = allEmissionTypes;
}
var dataLoaded = false;
var globalEmissions = [];
function drawMap(error, countries, emissions, countryContinentLookup) {
  if (error) {
    return error;
  }
  globalEmissions = emissions;
  initializeSelectors(countryContinentLookup, emissions);
  dataLoaded = true;
  svgGroup.append("g")
          .selectAll("path")
          .data(countries.features)
          .enter().append("path")
          .attr("class", "country")
          .attr("d", path)
          .on("click", function (d) {
            $('#countrySelector').multiselect("deselectAll", false).multiselect("refresh");
            $('#countrySelector').multiselect('select', [d.properties.name]);
            console.log(emissions.filter(function (e) {
              return e.Area.includes(d.properties.name);
            }));
            var selectedCountry = d.properties.name;
            selectedCountries = [];
            selectedCountries.push(selectedCountry);

            updatePieCountry();
            updateBarChart();
          });

  svg.call(d3.zoom()
             .scaleExtent([1 / 2, 500])
             .on("zoom", zoomed));

  drawPieChart();
  drawBarChart();
}

function updateMap() {

}

function zoomed() {
  svgGroup.attr("transform", d3.event.transform);
}

var replayFunction;
function drawBarChart() {
  var barData = globalEmissions.filter(function (d) {
    return selectedCountries.some(function (name) {
        return d.Area.includes(name);
      }) && d.Year > selectedYears[0] && d.Year < selectedYears[1];
  }).reduce(function (acc, val) {
    var name = val.Item.split(" ")[0].replace(/,/g, "");
    if (acc[name]) {
      acc[name] += +val.Value;
    } else {
      if (name != "Forest") {
        acc[name] = +val.Value;
      }
    }
    return acc;
  }, {});
  var dataSet = [];
  Object.keys(barData).forEach(function (d) {
    dataSet.push({
      "sector": d,
      "total": barData[d]
    })
  });
  dataSet["columns"] = ["sector", "total"];

  var margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40
    },
    width = 500 - margin.left - margin.right,
    height = 320 - margin.top - margin.bottom;

  var x = d3.scaleBand()
            .rangeRound([0, width])
            .padding(0.1);

  var y = d3.scaleLinear()
            .range([height, 0]);

  var xAxis = d3.axisBottom()
                .scale(x);

  var yAxis = d3.axisLeft()
                .scale(y)
                .ticks(10, "s");

  barSVG.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("fill", "white");

  barSVG.append("g")
        .attr("class", "y axis")
        .append("text")
        .attr("y", 0)
        .attr("dy", "-1em")
        .style("text-anchor", "start")
        .style("fill", "white")
        .text("Total Emissions (gigagrams)");

  replayFunction = function (data) {
    var slices = [];
    for (var i = 0; i < data.length; i++) {
      slices.push(data.slice(0, i + 1));
    }

    slices.forEach(function (slice, index) {
      setTimeout(function () {
        draw(slice);
      }, index * 300);
    });
  }

  function draw(data) {
    // measure the domain (for x, unique letters) (for y [0,maxFrequency])
    // now the scales are finished and usable
    x.domain(data.map(function (d) {
      return d.sector;
    }));
    y.domain([0, d3.max(data, function (d) {
      return d.total;
    })]);

    // another g element, this time to move the origin to the bottom of the barSVG element
    // someSelection.call(thing) is roughly equivalent to thing(someSelection[i])
    //   for everything in the selection\
    // the end result is g populated with text and lines!
    barSVG.select('.x.axis').transition().duration(300).call(xAxis).style("fill", "white");

    // same for yAxis but with more transform and a title
    barSVG.select(".y.axis").transition().duration(300).call(yAxis).style("fill", "white");

    // THIS IS THE ACTUAL WORK!
    var bars = barSVG.selectAll(".bar").data(data, function (d) {
      return d.sector;
    }); // (data) is an array/iterable thing, second argument is an ID generator function

    bars.exit()
        .transition()
        .duration(300)
        .attr("y", y(0))
        .attr("height", height - y(0))
        .remove();

    // data that needs DOM = enter() (a set/selection, not an event!)
    var enter = bars.enter().append("rect")
                    .attr("class", "bar")
                    .attr("y", y(0))
                    .attr("height", height - y(0))
                    .attr("x", function (d) {
                      return x(d.sector);
                    })
                    .attr("width", x.bandwidth())
                    .style("fill-opacity", "1")
                    .on("click", function (d) {
                      if(!selectedSectors.includes(d.sector)){
                        selectedSectors = [];
                        selectedSectors.push(d.sector);
                        $('#sectorSelector').multiselect("deselectAll", false).multiselect("refresh");
                        $('#sectorSelector').multiselect('select', [d.sector]);
                      }

                      updatePieSector(globalEmissions, d.sector);
                    });

    enter.on('mouseover', function (d) {
      tooltip.transition()
             .duration(300)
             .style('display', 'block');
    });
    enter.on('mousemove', function (d) {
      tooltip.select('.label').html(d.sector);
      tooltip.select('.count').html(d.total.toLocaleString() + " gigagrams");
      tooltip.style('display', 'block');
      tooltip.style("left", (d3.event.x) + 10 + "px")
             .style("top", (d3.event.y) + 10 + "px");
    });
    enter.on('mouseout', function () {
      tooltip.transition()
             .duration(300)
             .style('display', 'none');
    });

    // the "UPDATE" set:
    bars.merge(enter).transition().duration(300).attr("x", function (d) {
      return x(d.sector);
    }) // (d) is one item from the data array, x is the scale object from above
        .attr("width", x.bandwidth()) // constant, so no callback function(d) here
        .attr("y", function (d) {
          return y(d.total);
        })
        .attr("height", function (d) {
          return height - y(d.total);
        }); // flip the height, because y's domain is bottom up, but barSVG renders top down

  }

  replayFunction(dataSet);
}

function updateBarChart() {
  var barData = globalEmissions.filter(function (d) {
    return d.Year > selectedYears[0] && d.Year < selectedYears[1] && selectedCountries.some(function (name) {
        return d.Area.includes(name)
      });
  }).reduce(function (acc, val) {
    var name = val.Item.split(" ")[0].replace(/,/g, "");
    if (acc[name]) {
      acc[name] += +val.Value;
    } else {
      if (name != "Forest") {
        acc[name] = +val.Value;
      }
    }
    return acc;
  }, {});
  var dataSet = [];
  Object.keys(barData).forEach(function (d) {
    dataSet.push({
      "sector": d,
      "total": barData[d]
    })
  });
  dataSet["columns"] = ["sector", "total"];
  replayFunction(dataSet);
}

function drawPieChart() {
  var pieData = globalEmissions.filter(function (d) {
    return d.Year >= selectedYears[0] && d.Year <= selectedYears[1] && d.Element.includes("Emissions (CO2eq) from")
  }).reduce(function (acc, val) {
    if (acc[val.Element]) {
      acc[val.Element] += +val.Value;
    } else {
      acc[val.Element] = +val.Value;
    }
    return acc;
  }, {});
  var dataset = [];
  Object.keys(pieData).forEach(function (d) {
    dataset.push({
      "count": pieData[d],
      "label": d.replace("Emissions (CO2eq) from", "")
    })
  });
  dataset['columns'] = ['count', 'label'];
  tooltip.append('div')
         .attr('class', 'label');
  tooltip.append('div')
         .attr('class', 'count');
  pie = d3.pie().value(function (d) {
    return d.count;
  })
          .sort(null);

  piePath = pieSVG.selectAll('path')
                  .data(pie(dataset))
                  .enter()
                  .append('path')
                  .attr('d', arc)
                  .attr('fill', function (d, i) {
                    return color(d.data.label);
                  })
                  .each(function (d) {
                    this._current = d;
                  });
  piePath.on('mouseover', function (d) {
    tooltip.transition()
           .duration(300)
           .style('display', 'block');
  });
  piePath.on('mousemove', function (d) {
    tooltip.select('.label').html(d.data.label);
    tooltip.select('.count').html(d.data.count.toLocaleString() + " gigagrams");
    tooltip.style('display', 'block');
    tooltip.style("left", (d3.event.x) + 10 + "px")
           .style("top", (d3.event.y) + 10 + "px");
  });
  piePath.on('mouseout', function () {
    tooltip.transition()
           .duration(300)
           .style('display', 'none');
  });
  var legend = pieSVG.selectAll('.legend')
                     .data(color.domain())
                     .enter()
                     .append('g')
                     .attr('class', 'legend')
                     .attr('transform', function (d, i) {
                       var height = legendRectSize + legendSpacing;
                       var offset = height * color.domain().length / 2;
                       var horz = -2 * legendRectSize;
                       var vert = i * height - offset;
                       return 'translate(' + horz + ',' + vert + ')';
                     });
  legend.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', color)
        .style('stroke', color)
        .on('click', function (label) {
          var rect = d3.select(this);
          var enabled = true;
          var totalEnabled = d3.sum(dataset.map(function (d) {
            return (d.enabled) ? 1 : 0;
          }));
          if (rect.attr('class') == 'disabled') {
            rect.attr('class', '');
          } else {
            if (totalEnabled < 2) {
              return;
            }
            rect.attr('class', 'disabled');
            enabled = false;
          }
          pie.value(function (d) {
            if (d.label == label) {
              d.enabled = enabled;
            }
            return (d.enabled) ? d.count : 0;
          });
          piePath = piePath.data(pie(dataset));
          piePath.transition()
                 .duration(750)
                 .attrTween('d', function (d) {
                   var interpolate = d3.interpolate(this._current, d);
                   this._current = interpolate(0);
                   return function (t) {
                     return arc(interpolate(t));
                   };
                 });
        });
  legend.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(function (d) {
          return d;
        })
        .style("fill", "white");
}

function updatePieCountry() {
  var pieData = globalEmissions.filter(function (d) {
    return selectedSectors.some(function (sector) {
        return d.Item.includes(sector)
      }) && selectedCountries.some(function (name) {
        return d.Area.includes(name)
      }) && selectedEmissionTypes.some(function(type){
        return d.Element.includes(type)
      }) && d.Year >= selectedYears[0] && d.Year <= selectedYears[1];
  }).reduce(function (acc, val) {
    if (acc[val.Element]) {
      acc[val.Element] += +val.Value
    } else {
      acc[val.Element] = +val.Value
    }
    return acc;
  }, {});
  var dataset = [];
  Object.keys(pieData).forEach(function (d) {
    dataset.push({
      "count": pieData[d],
      "label": d.replace("Emissions (CO2eq) from", "")
    })
  });
  if (dataset.length === 0) {
    pieSVG.transition().duration(300).attr("display", "none");
  } else {
    pieSVG.transition().duration(300).attr("display", "block");
  }

  pie.value(function (d) {
    return d.count;
  });
  var newPie = piePath.data(pie(dataset));
  piePath.merge(newPie).transition().duration(500).attr("d", arc);
}

function updatePieSector() {
  var pieData = globalEmissions.filter(function (d) {
    return selectedSectors.some(function (sector) {
        return d.Item.includes(sector)
      }) && selectedCountries.some(function (name) {
        return d.Area.includes(name)
      }) && selectedEmissionTypes.some(function(type){
        return d.Element.includes(type)
      }) && d.Year >= selectedYears[0] && d.Year <= selectedYears[1] ;
  }).reduce(function (acc, val) {
    if (acc[val.Element]) {
      acc[val.Element] += +val.Value
    } else {
      acc[val.Element] = +val.Value
    }
    return acc;
  }, {});
  var dataset = [];
  Object.keys(pieData).forEach(function (d) {
    dataset.push({
      "count": pieData[d],
      "label": d.replace("Emissions (CO2eq) from", "")
    })
  });
  pie.value(function (d) {
    return d.count;
  });
  var newPie = piePath.data(pie(dataset));
  piePath.merge(newPie).transition().duration(500).attr("d", arc);
  debugger;
}