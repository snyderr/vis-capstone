var holder = d3.select("body").append("div");
var svg = holder.append("svg").attr("class", "mapSvg").attr("width", "75%").attr("height", "75%");
var textInfo = holder.append("div").attr("width", "100%").attr("height", "100%");
var svgGroup = svg.append("g");
var width = parseInt(svg.style('width'));
var height = parseInt(svg.style('height'));
var projection = d3.geoEquirectangular().scale(135).center([48, 25]).translate([width / 2, height / 2]);
var path = d3.geoPath().projection(projection);
var slider, colorScale;

d3.queue()
  .defer(d3.json, "countries.geo.json")
  .defer(d3.csv, "FAOSTAT_data_4-12-2017.csv")
  .await(drawMap);

function drawMap(error, countries, emissions){
  if(error)
    return error;
  svgGroup.append("g")
            .selectAll("path")
            .data(countries.features)
            .enter().append("path")
            .attr("class", "country")
            .attr("d", path)
            .on("click", function(d){
              console.log(d.properties.name);
              console.log(emissions.filter(function(e){return e.Area.includes(d.properties.name);}));
              });

  svg.call(d3.zoom()
               .scaleExtent([1 / 2, 500])
               .on("zoom", zoomed));
}

function zoomed() {
    svgGroup.attr("transform", d3.event.transform);
}
