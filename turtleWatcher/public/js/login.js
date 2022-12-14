$(() => {
  $('#login').on('click', (e) => {
    e.preventDefault();
    const user = $('.user').val();
    const password = $('.password').val();
    // console.log(user);
    // console.log(password);
    // $('.error').remove();
    $.ajax({
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      url: '/api/1.0/user/login',
      data: JSON.stringify({ user, password }),
      success: () => {
        console.log('success');
        window.location.href = '/';
      },
      error: (err) => {
        const message = err.responseJSON?.message;
        if (message) {
          console.log(message);
          $('.warn').text(`${message}`);
        }
      },
    });
  });
  $('.user').on({
    keydown(e) {
      if (e.which === 32) return false;
      return true;
    },
    change() {
      this.value = this.value.replace(/\s/g, '');
    },
  });
  $('.password').on({
    keydown(e) {
      if (e.which === 32) return false;
      return true;
    },
    change() {
      this.value = this.value.replace(/\s/g, '');
    },
  });
});
