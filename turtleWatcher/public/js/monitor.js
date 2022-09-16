/* eslint-disable prefer-arrow-callback */
$(() => {
  /*
  * Flot Interactive Chart
  * -----------------------
  */
  // We use an inline data source in the example, usually data would
  // be fetched from a server
  const updateInterval = 5000; // Fetch data ever x milliseconds
  const realtime = 'on'; // If == to on then fetch data every x seconds. else stop fetching

  function getData(queue) {
    // const currentTime = Date.now();
    // const index = 1;
    const res = [];

    for (let i = 0; i < queue.length; i++) {
      res.push([queue[i]?.time, queue[i]?.queueSize]);
    }
    return res;
  }

  function createPlot(name) {
    let chartBody = $('<div></div>').addClass('card-body').attr('id', `queue-${name}`);
    const queueTitleH3 = $('<h3></h3>').addClass('card-title').text(name);
    const interactiveDiv = $('<div></div>').addClass('interactive').attr('id', `interactive-${name}`).attr('data-queue', name)
      .css({ height: '300px', padding: '0px', position: 'relative' });
    chartBody = chartBody.append(queueTitleH3);
    chartBody = chartBody.append(interactiveDiv);
    $('#chart-container').append(chartBody);
  }
  function deletePlot(name) {
    $(`#queue-${name}`).remove();
  }

  function update() {
    $.ajax('http://localhost:3000/api/1.0/queue')

      .done((result) => {
        const queueName = Object.keys(result);
        $('.interactive').each(function () {
          const queue = $(this).data('queue');
          const isExistQueue = queueName.includes(queue);
          if (!isExistQueue) {
            deletePlot(queue);
          }
        });

        queueName.forEach((name) => {
          const isPlot = $(`#interactive-${name}`).length;
          if (!isPlot) {
            createPlot(name);
          }
          const res = getData(result[name]);
          const start = res[0][0];
          const end = res.at(-1)[0];
          const step = Math.floor((end - start) / 15);
          const arrayLength = Math.floor(((end - start) / step)) + 1;
          const range = [...Array(arrayLength).keys()].map((x) => (x * step) + start);
          const interactivePlot = $.plot(
            `#interactive-${name}`,
            [
              {
                label: 'Foo', data: getData(result[name]),
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
          // interactivePlot.setData([getData()]);
          // Since the axes don't change, we don't need to call plot.setupGrid()
          interactivePlot.draw();
        });
        if (realtime === 'on') {
          setTimeout(update, updateInterval);
        }
      });
  }
  // INITIALIZE REALTIME DATA FETCHING
  update();
  /*
  * END INTERACTIVE CHART
  */
});
