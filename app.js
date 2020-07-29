// converts weather data to {desc : count}
// e.g., {"cloudy": 9, "rain": 10}
function rollupWeatherByDesc(acc, cur) {
  if (cur.description in acc) {
    acc[cur.description]++;
  } else {
    acc[cur.description] = 1;
  }
  return acc;
}

// custom sort & fill color for pie chart segments
var weatherInfoByDesc = {
  sunny: { sortIdx: 0, color: "#ffff00" },
  "mostly sunny": { sortIdx: 1, color: "#fffacd" },
  "partly sunny": { sortIdx: 2, color: "#fdf5e6" },
  "partly cloudy": { sortIdx: 3, color: "#d3d3d3" },
  "mostly cloudy": { sortIdx: 4, color: "#808080" },
  cloudy: { sortIdx: 5, color: "#505050" },
  drizzle: { sortIdx: 6, color: "#87cefa" },
  rain: { sortIdx: 7, color: "#00f" },
  rainbow: { sortIdx: 8, color: "#8B4513" },
};

function makePieChart(data, id) {
  var width = 200,
    height = 200,
    radius = width / 2;
  var tooltip = d3.select("#weather").append("div").classed("tooltip", true);

  d3.select(id)
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`)
    .classed("chart", true);

  var arcs = d3
    .pie()
    .value((d) => d.value)
    .sort((a, b) => {
      if (weatherInfoByDesc[a.key].sortIdx < weatherInfoByDesc[b.key].sortIdx) {
        return -1;
      } else if (
        weatherInfoByDesc[a.key].sortIdx > weatherInfoByDesc[b.key].sortIdx
      ) {
        return 1;
      } else {
        // should never get here
        return 0;
      }
    })(d3.entries(data));

  var path = d3.arc().outerRadius(radius).innerRadius(0);

  var update = d3.select(`${id} .chart`).selectAll(".arc").data(arcs);
  update.exit().remove();

  update
    .enter()
    .append("path")
    .classed("arc", true)
    .merge(update)
    .attr("fill", function (d) {
      return weatherInfoByDesc[d.data.key].color;
    })
    .attr("stroke", "black")
    .attr("d", path)
    .on("mouseover", function (d) {
      tooltip.style("display", "block");
      tooltip.style("opacity", 1);
    })
    .on("mousemove", function (d) {
      tooltip
        .style("top", d3.event.y + 10 + "px")
        .style("left", d3.event.x - 25 + "px")
        .text(
          `${d.data.key}: ${d.data.value} ${d.data.value == 1 ? "day" : "days"}`
        );
    })
    .on("mouseout", function (d) {
      tooltip.style("opacity", 0);
    });
}

function makeTimeChart(dataFiles, month) {
  var margin = { top: 20, right: 20, bottom: 30, left: 50 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
  var parseTime = d3.timeParse("%B %d");
  var [eugeneData, seattleData, hbData, okcData] = dataFiles;

  dataFiles.forEach(function (dataFile) {
    dataFile.forEach(function (d) {
      d.date = parseTime(`${month} ${d.day}`);
    });
  });

  // x and y are functions
  // in: datapoint.date, datapoint.temperature
  // out: where in px datapoint belongs on graph
  var x = d3.scaleTime().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);

  var lineGenerator = d3
    .line()
    .x(function (d) {
      return x(d.date);
    })
    .y(function (d) {
      return y(d.temperature);
    });

  var svg = d3
    .select("#timechart")
    .append("svg")
    .classed("timechart", true)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate (${margin.left}, ${margin.top})`);

  // Scale the range of the data
  x.domain(
    //can pass any dataset to extent() since months all same length
    d3.extent(eugeneData, function (d) {
      return d.date;
    })
  );
  y.domain([30, 100]);

  // draw the lines
  svg
    .append("path")
    .data([okcData])
    .attr("class", "line")
    .style("stroke", "#6ECF32")
    .attr("d", lineGenerator);
  svg
    .append("path")
    .data([eugeneData])
    .attr("class", "line")
    .style("stroke", "magenta")
    .attr("d", lineGenerator);
  svg
    .append("path")
    .data([hbData])
    .attr("class", "line")
    .style("stroke", "orange")
    .attr("d", lineGenerator);
  svg
    .append("path")
    .data([seattleData])
    .attr("class", "line")
    .style("stroke", "#6229ff")
    .attr("d", lineGenerator);

  // Add the X Axis
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3
        .axisBottom(x)
        .ticks(d3.timeDay.every(2))
        .tickFormat(d3.timeFormat("%b %d"))
    );

  // Add the Y Axis
  svg.append("g").call(d3.axisLeft(y));

  var tooltip = d3.select("#timechart").append("div").classed("tooltip", true);
  var tooltipLine = svg.append("line");
  var tipBox = svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("opacity", 0)
    .on("mousemove", drawTooltip)
    .on("mouseout", removeTooltip);

  function drawTooltip() {
    // get the date on the x-axis corresponding to the user's mouse location
    var dateString = x.invert(d3.mouse(tipBox.node())[0]);
    var day = dateString.getDate(); // just a number
    var [eugeneTemp, seattleTemp, hbTemp, okcTemp] = dataFiles.map(
      (dataFile) => dataFile.filter((d) => d.day == day)[0].temperature
    ); // get the temperature in each city on that day

    // dk if this is necessary
    var d3DateString = parseTime(`${month} ${day}`);

    tooltipLine
      .attr("stroke", "black")
      .attr("x1", x(d3DateString))
      .attr("x2", x(d3DateString))
      .attr("y1", 0)
      .attr("y2", height);

    tooltip
      .html(
        `
		<div>${month} ${day}<br />
			<span class="lime-green-text">OKC: ${okcTemp}&deg;</span><br />
      <span class="magenta-text">Eug: ${eugeneTemp}&deg;</span><br />
      <span class="orange-text">HB: ${hbTemp}&deg;</span><br />
      <span class="indigo-text">Seattle: ${seattleTemp}&deg;</seattle><br />
		</div>`
      )
      .style("display", "block")
      .style("left", d3.event.x + 10 + "px")
      .style("top", d3.event.y - 10 + "px");
  }

  function removeTooltip() {
    if (tooltip) {
      tooltip.style("display", "none");
    }
    if (tooltipLine) {
      tooltipLine.attr("stroke", "none");
    }
  }
}

function renderCharts() {
  // clear previous time chart
  document.getElementById("timechart").innerHTML = "";
  var month = document.getElementById("mySelect").value;
  var dataFiles = [
    eugeneDataFebruary,
    seattleDataFebruary,
    hbDataFebruary,
    okcDataFebruary,
  ];
  if (month == "July") {
    dataFiles = [eugeneDataJuly, seattleDataJuly, hbDataJuly, okcDataJuly];
  }
  var [
    eugenePieChartData,
    seattlePieChartData,
    hbPieChartData,
    okcPieChartData,
  ] = dataFiles.map((d) => d.reduce(rollupWeatherByDesc, {}));

  makePieChart(eugenePieChartData, "#eugene");
  makePieChart(seattlePieChartData, "#seattle");
  makePieChart(hbPieChartData, "#hb");
  makePieChart(okcPieChartData, "#okc");

  makeTimeChart(dataFiles, month);
}

renderCharts();
