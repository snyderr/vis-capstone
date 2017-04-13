var holder = d3.select("body").append("div");
var svg = holder.append("svg").attr("class", "mapSvg").attr("width", "75%").attr("height", "75%");
var pieSVG = holder.append('svg').attr("class", "pieSVG").attr('width', "320px").attr('height', "320px").append('g').attr('transform', 'translate(' + 160 + ',' + 160 + ')');
var tooltip = holder.append('div').attr('class', 'tooltip').style('display', 'none');
var svgGroup = svg.append("g");
var width = parseInt(svg.style('width'));
var height = parseInt(svg.style('height'));
var projection = d3.geoEquirectangular().scale(135).center([48, 25]).translate([width / 2, height / 2]);
var path = d3.geoPath().projection(projection);
var slider, colorScale;
var selectedYear = 1990;



//Pie chart
var width = 320;
var height = 320;
var radius = Math.min(width, height) / 2
var donutWidth = 75;
var legendRectSize = 18;
var legendSpacing = 4;
var color = d3.scaleOrdinal(d3.schemeCategory20);
var arc = d3.arc().innerRadius(radius - donutWidth).outerRadius(radius);
var pie, piePath;


d3.queue()
    .defer(d3.json, "countries.geo.json")
    .defer(d3.csv, "FAOSTAT_data_4-12-2017.csv")
    .await(drawMap);

function drawMap(error, countries, emissions) {
    if (error)
        return error;
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
        });


    svg.call(d3.zoom()
        .scaleExtent([1 / 2, 500])
        .on("zoom", zoomed));

    drawPieChart(emissions);
}

function zoomed() {
    svgGroup.attr("transform", d3.event.transform);
}

function drawPieChart(emissions) {
    tooltip.append('div')
        .attr('class', 'label');
    tooltip.append('div')
        .attr('class', 'count');
    tooltip.append('div')
        .attr('class', 'percent');
    pie = d3.pie().value(function(d) {
            return d.count;
        })
        .sort(null);
    d3.csv('data.csv', function(error, dataset) {
        dataset.forEach(function(d) {
            d.count = +d.count;
            d.enabled = true;
        });
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
            var total = d3.sum(dataset.map(function(d) {
                return (d.enabled) ? d.count : 0;
            }));
            var percent = Math.round(1000 * d.data.count / total) / 10;
            tooltip.select('.label').html(d.data.label);
            tooltip.select('.count').html(d.data.count);
            tooltip.select('.percent').html(percent + '%');
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
                    if (totalEnabled < 2) return;
                    rect.attr('class', 'disabled');
                    enabled = false;
                }
                pie.value(function(d) {
                    if (d.label === label) d.enabled = enabled;
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
    });

}