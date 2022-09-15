$(() => {
  /*
  * Flot Interactive Chart
  * -----------------------
  */
  // We use an inline data source in the example, usually data would
  // be fetched from a server
  let j = 0;
  let data = [];
  const totalPoints = 150;
  function getRandomData() {
    if (data.length > 0) {
      data = data.slice(1);
    }
    // Do a random walk
    while (data.length < totalPoints) {
      const prev = data.length > 0 ? data[data.length - 1] : 50;
      let y = prev + Math.random() * 10 - 5;
      if (y < 0) {
        y = 0;
      } else if (y > 100) {
        y = 100;
      }
      data.push(y);
    }
    // Zip the generated y values with the x values
    const res = [];
    for (let i = j; i < j + data.length; ++i) {
      res.push([i, data[i - j]]);
    }
    return res;
  }

  const updateInterval = 1000; // Fetch data ever x milliseconds
  const realtime = 'on'; // If == to on then fetch data every x seconds. else stop fetching
  function update() {
    const start = j;
    const end = j + totalPoints;
    const step = 10;
    const arrayLength = Math.floor(((end - start) / step)) + 1;
    const range = [...Array(arrayLength).keys()].map((x) => (x * step) + start);

    j += 1;
    const interactivePlot = $.plot(
      '#interactive',
      [
        {
          label: 'Foo', data: getRandomData(),
        },
      ],
      {
        grid: {
          borderColor: '#f3f3f3',
          borderWidth: 1,
          tickColor: '#f3f3f3',
        },
        series: {
          color: '#3c8dbc',
          lines: {
            lineWidth: 2,
            show: true,
            fill: true,
          },
        },
        yaxis: {
          ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 100],
          min: 0,
          max: 100,
          show: true,
        },
        xaxis: {
          ticks: range,
          mode: 'time',
          timeBase: 'seconds',
          timeformat: '%H:%M:%S',
          min: 0,
          max: 100,
          show: true,
        },
      },
    );
    interactivePlot.setData([getRandomData()]);
    // Since the axes don't change, we don't need to call plot.setupGrid()
    interactivePlot.draw();
    if (realtime === 'on') {
      setTimeout(update, updateInterval);
    }
  }
  // INITIALIZE REALTIME DATA FETCHING
  update();
  /*
  * END INTERACTIVE CHART
  */
});
