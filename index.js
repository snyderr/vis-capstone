var holder = d3.select("body").append("div");
var svg = holder.append("svg").attr("class", "mapSvg").attr("width", "100%").attr("height", "100%");
var pieSVG = holder.append('svg').attr("class", "pieSVG").attr('width', "320px").attr('height', "320px").append('g')
    .attr('transform', 'translate(' + 160 + ',' + 160 + ')');
var barSVG = holder.append('svg').attr("class", "barSVG").attr('width', "500px").attr('height', "320px").append('g')
    .attr('transform', 'translate(' + 50 + ',' + 10 + ')');
var tooltip = holder.append('div').attr('class', 'tooltip').style('display', 'none');
var svgGroup = svg.append("g");
var width = parseInt(svg.style('width'));
var height = parseInt(svg.style('height'));
var projection = d3.geoEquirectangular().scale(135).center([80, 0]).translate([width / 2, height / 2]);
var path = d3.geoPath().projection(projection);
var slider, colorScale;
var selectedYear = 1990;
var selectedCountry;

//Pie chart
var width = 320;
var height = 320;
var radius = Math.min(width, height) / 2
var donutWidth = 75;
var legendRectSize = 18;
var legendSpacing = 4;
var color = d3.scaleOrdinal(d3.schemeCategory20);
var arc = d3.arc().innerRadius(radius - donutWidth).outerRadius(radius);
var pie, piePath, selectedCountry;

d3.queue()
    .defer(d3.json, "countries.geo.json")
    .defer(d3.csv, "FAOSTAT_data_4-12-2017.csv")
    .await(drawMap);

function drawMap(error, countries, emissions) {
    if (error) {
        return error;
    }
    svgGroup.append("g")
        .selectAll("path")
        .data(countries.features)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .on("click", function(d) {
            console.log(d.properties.name);
            console.log(emissions.filter(function(e) {
                return e.Area.includes(d.properties.name);
            }));
            selectedCountry = d.properties.name;
            updatePieCountry(emissions, d.properties.name);
        })

    svg.call(d3.zoom()
        .scaleExtent([1 / 2, 500])
        .on("zoom", zoomed));

    drawPieChart(emissions);
    drawBarChart(emissions);
}

function zoomed() {
    svgGroup.attr("transform", d3.event.transform);
}

function drawBarChart(emissions) {
    var barData = emissions.filter(function(d) {
        return d.Year == selectedYear && d.Element == "Emissions (CO2eq)"
    }).reduce(function(acc, val) {
        var name = val.Item.split(" ")[0].replace(/,/g, "");
        if (acc[name]) {
            //acc[name] += Math.abs(+val.Value);
            acc[name] += +val.Value;
        } else {
            //acc[name] = Math.abs(+val.Value);
            if (name != "Forest")
                acc[name] = +val.Value;
        }
        return acc;
    }, {});
    dataset = [];
    Object.keys(barData).forEach(function(d) {
        dataset.push({
            "sector": d,
            "total": barData[d]
        })
    });
    dataset["columns"] = ["sector", "total"];

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
        .ticks(10, "%");

    barSVG.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .style("fill", "white");

    barSVG.append("g")
        .attr("class", "y axis")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .style("fill", "white")
        .text("Frequency");

    function replay(data) {
        var slices = [];
        for (var i = 0; i < data.length; i++) {
            slices.push(data.slice(0, i + 1));
        }

        slices.forEach(function(slice, index) {
            setTimeout(function() {
                draw(slice);
            }, index * 300);
        });
    }

    function draw(data) {
        // measure the domain (for x, unique letters) (for y [0,maxFrequency])
        // now the scales are finished and usable
        x.domain(data.map(function(d) {
            return d.sector;
        }));
        y.domain([0, d3.max(data, function(d) {
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
        var bars = barSVG.selectAll(".bar").data(data, function(d) {
                return d.sector;
            }) // (data) is an array/iterable thing, second argument is an ID generator function

        bars.exit()
            .transition()
            .duration(300)
            .attr("y", y(0))
            .attr("height", height - y(0))
            .style('fill-opacity', 1e-6)
            .remove();

        // data that needs DOM = enter() (a set/selection, not an event!)
        var enter = bars.enter().append("rect")
            .attr("class", "bar")
            .attr("y", y(0))
            .attr("height", height - y(0))
            .attr("x", function(d) {
                return x(d.sector);
            })
            .attr("width", x.bandwidth())
            .on("click", function(d) {
                updatePieSector(emissions, d.sector);
            });

        // the "UPDATE" set:
        bars.merge(enter).transition().duration(300).attr("x", function(d) {
                return x(d.sector);
            }) // (d) is one item from the data array, x is the scale object from above
            .attr("width", x.bandwidth()) // constant, so no callback function(d) here
            .attr("y", function(d) {
                return y(d.total);
            })
            .attr("height", function(d) {
                return height - y(d.total);
            }); // flip the height, because y's domain is bottom up, but barSVG renders top down
    }

    replay(dataset);
}

function drawPieChart(emissions) {
    var pieData = emissions.filter(function(d) {
        return d.Year == selectedYear && d.Element.includes("Emissions (CO2eq) from")
    }).reduce(function(acc, val) {
        if (acc[val.Element]) {
            acc[val.Element] += +val.Value;
        } else {
            acc[val.Element] = +val.Value;
        }
        return acc;
    }, {});
    var dataset = [];
    Object.keys(pieData).forEach(function(d) {
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
    pie = d3.pie().value(function(d) {
            return d.count;
        })
        .sort(null);

    piePath = pieSVG.selectAll('path')
        .data(pie(dataset))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', function(d, i) {
            return color(d.data.label);
        })
        .each(function(d) {
            this._current = d;
        });
    piePath.on('mouseover', function(d) {
        tooltip.transition()
            .duration(300)
            .style('display', 'block');
    });
    piePath.on('mousemove', function(d) {
        tooltip.select('.label').html(d.data.label);
        tooltip.select('.count').html(d.data.count.toLocaleString() + " gigagrams");
        tooltip.style('display', 'block');
        tooltip.style("left", (d3.event.x) + 10 + "px")
            .style("top", (d3.event.y) + 10 + "px");
    });
    piePath.on('mouseout', function() {
        tooltip.transition()
            .duration(300)
            .style('display', 'none');
    });
    var legend = pieSVG.selectAll('.legend')
        .data(color.domain())
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
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
        .on('click', function(label) {
            var rect = d3.select(this);
            var enabled = true;
            var totalEnabled = d3.sum(dataset.map(function(d) {
                return (d.enabled) ? 1 : 0;
            }));
            if (rect.attr('class') === 'disabled') {
                rect.attr('class', '');
            } else {
                if (totalEnabled < 2) {
                    return;
                }
                rect.attr('class', 'disabled');
                enabled = false;
            }
            pie.value(function(d) {
                if (d.label === label) {
                    d.enabled = enabled;
                }
                return (d.enabled) ? d.count : 0;
            });
            piePath = piePath.data(pie(dataset));
            piePath.transition()
                .duration(750)
                .attrTween('d', function(d) {
                    var interpolate = d3.interpolate(this._current, d);
                    this._current = interpolate(0);
                    return function(t) {
                        return arc(interpolate(t));
                    };
                });
        });
    legend.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(function(d) {
            return d;
        })
        .style("fill", "white");
}

function updatePieCountry(emissions, name) {
    var pieData = emissions.filter(function(d) {
        return d.Area.includes(name) && d.Year == selectedYear && d.Element.includes("Emissions (CO2eq) from")
    }).reduce(function(acc, val) {
        if (acc[val.Element]) {
            acc[val.Element] += +val.Value
        } else {
            acc[val.Element] = +val.Value
        }
        return acc;
    }, {});
    var dataset = [];
    Object.keys(pieData).forEach(function(d) {
        dataset.push({
            "count": pieData[d],
            "label": d.replace("Emissions (CO2eq) from", "")
        })
    });
    if (dataset.length == 0) {
        pieSVG.transition().duration(300).attr("display", "none");
    } else {
        pieSVG.transition().duration(300).attr("display", "block");
    }

    var value = this.value;
    pie.value(function(d) {
        return d.count;
    });
    var newPie = piePath.data(pie(dataset));
    piePath.merge(newPie).transition().duration(500).attr("d", arc);
}

function updatePieSector(emissions, sector) {
    var pieData = emissions.filter(function(d) {
        return d.Item.includes(sector) && d.Area.includes(name) && d.Year == selectedYear && d.Element.includes("Emissions (CO2eq) from")
    }).reduce(function(acc, val) {
        if (acc[val.Element]) {
            acc[val.Element] += +val.Value
        } else {
            acc[val.Element] = +val.Value
        }
        return acc;
    }, {});
    var dataset = [];
    Object.keys(pieData).forEach(function(d) {
        dataset.push({
            "count": pieData[d],
            "label": d.replace("Emissions (CO2eq) from", "")
        })
    });
    var value = this.value;
    pie.value(function(d) {
        return d.count;
    });
    var newPie = piePath.data(pie(dataset));
    piePath.merge(newPie).transition().duration(500).attr("d", arc);
    debugger;
}