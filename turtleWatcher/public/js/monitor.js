/* eslint-disable prefer-arrow-callback */
$(() => {
  const produceForms = document.querySelectorAll('.needs-validation-produce');
  // Prevent produce submission
  Array.prototype.slice.call(produceForms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity()) {
          $.ajax({
            url: '/api/1.0/queue/produce',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              queue: $('#produce-queue').val(),
              messages: [
                $('#produce-messages').val(),
              ],
            }),
          });
        }

        form.classList.add('was-validated');
      }, false);
    });

  const consumeForms = document.querySelectorAll('.needs-validation-consume');
  // Prevent produce submission
  Array.prototype.slice.call(consumeForms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        console.log('ok');
        event.preventDefault();
        event.stopPropagation();
        if (form.checkValidity()) {
          console.log($('#consume-queue').val());
          $.ajax({
            url: '/api/1.0/queue/consume',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            data: JSON.stringify({
              queue: $('#consume-queue').val(),
              quantity: $('#consume-quantity').val(),
            }),
          });
        }

        form.classList.add('was-validated');
      }, false);
    });
  /*
  * Flot Interactive Chart
  * -----------------------
  */
  // We use an inline data source in the example, usually data would
  // be fetched from a server
  const updateInterval = 5000; // Fetch data ever x milliseconds fetching
  const HISTORY_TIME = 60 * 60 * 1000;
  const HISTORY_INTERVAL = 50000;

  function getData(queue) {
    const res = [];
    const currentTime = Date.now();
    const startTime = currentTime - HISTORY_TIME;
    let index = 0;
    for (let time = startTime; time < currentTime; time += HISTORY_INTERVAL) {
      if (queue[index + 1]?.time < time) {
        res.push([time, queue[index]?.queueSize]);
        while (queue[index + 1]?.time < time) {
          index++;
        }
      } else {
        res.push([time, queue[index]?.queueSize]);
      }
    }
    res.push([currentTime, queue.at(-1)?.queueSize]);
    // for (let i = 0; i < queue.length; i++) {
    //   res.push([queue[i]?.time, queue[i]?.queueSize]);
    // }

    return res;
  }

  function createPlot(name) {
    const chartBody = $('<div></div>').addClass('card-body').attr('id', `queue-${name}`);
    const progressBarContainer = $('<div></div>').addClass('progress-bar-container d-flex align-items-center');
    const queueTitleH3 = $('<h3></h3>').addClass('card-title').text(`queue ${name}`);
    const queueCapacity = $('<h4></h4>').addClass(`${name}-queue-size`);
    const progressBarHolderDiv = $('<div></div>').addClass('progress-bar-holder');
    const progressBarDiv = $('<div></div>').addClass('progress-bar').attr('id', `bar-${name}`);
    const interactiveDiv = $('<div></div>').addClass('interactive').attr('id', `interactive-${name}`).attr('data-queue', name)
      .css({ height: '300px', padding: '0px', position: 'relative' });

    queueTitleH3.appendTo(progressBarContainer);
    progressBarHolderDiv.appendTo(progressBarContainer);
    queueCapacity.appendTo(progressBarContainer);
    progressBarDiv.appendTo(progressBarHolderDiv);
    progressBarContainer.appendTo(chartBody);
    interactiveDiv.appendTo(chartBody);
    $('#chart-container').append(chartBody);

    $('<div class="tooltip-inner" id="line-chart-tooltip"></div>').css({
      position: 'absolute',
      display: 'none',
      opacity: 0.8,
    }).appendTo('body');
  }

  function deletePlot(name) {
    $(`#queue-${name}`).remove();
  }

  function update() {
    try {
      $.ajax('/api/1.0/queue')
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
            const { maxLength } = result[name];
            const { queueSize } = result[name].queueSize.at(-1);
            if (!isPlot) {
              createPlot(name);
              $(`#interactive-${name}`).bind('plothover', function (event, pos, item) {
                if (item) {
                  const y = item.datapoint[1].toFixed(0);

                  $('#line-chart-tooltip').html(`${y}`)
                    .css({
                      top: item.pageY + 5,
                      left: item.pageX + 5,
                    })
                    .fadeIn(200);
                } else {
                  $('#line-chart-tooltip').hide();
                }
              });
            }
            // update queue size
            $(`.${name}-queue-size`).text(`${queueSize} / ${maxLength}`);
            const res = getData(result[name].queueSize);
            const interactivePlot = $.plot(
              `#interactive-${name}`,
              [
                {
                  label: name,
                  data: res,
                },
              ],
              {
                grid: {
                  hoverable: true,
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
                  show: true,
                },
                xaxis: {
                  mode: 'time',
                  timeBase: 'miliseconds',
                  timeformat: '%H:%M:%S',
                  show: true,
                },
              },
            );

            // interactivePlot.setData([getData(result[name].queueSize)]);
            // Since the axes don't change, we don't need to call plot.setupGrid()
            // interactivePlot.setupGrid();
            interactivePlot.draw();
            const percentage = (res.at(-1)[1] / maxLength) * 100;
            $(`#bar-${name}`).css({ transition: ' 0.5s', 'transition-timing-function': 'linear', width: `${0.9 * percentage + 10}%` }, 800).text(`${Math.round(percentage, 2)}%`);
          });
        });
    } catch (error) {
      console.log(error);
    }
    setTimeout(update, updateInterval);
  }
  // INITIALIZE REALTIME DATA FETCHING
  update();
  /*
  * END INTERACTIVE CHART
  */
});
