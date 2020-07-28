// Check date equality ignoring milliseconds
const dateEqualsNoMilliseconds = (date1, date2) =>
  Math.floor(date1.getTime() / 1000) === Math.floor(date2.getTime() / 1000);

// Check date equality ignoring time
const dateEqualsNoTime = (date1, date2) =>
  Math.floor(date1.getTime() / 86400000) === Math.floor(date2.getTime() / 86400000);

const utcNow = (tzOffset) => new Date(Date.now() + (tzOffset  * 60000));

const twelveUTC = () => {
  const d = new Date();
  d.setUTCHours(12, 0, 0,0);
  return d;
};

const timeAsInt = () => {
  const date = new Date();
  let minutes = date.getMinutes();
  minutes = minutes >= 10 ? minutes : `0${minutes}`;
  let seconds = date.getMinutes();
  seconds = seconds >= 10 ? seconds : `0${seconds}`;

  return parseInt(`${date.getHours()}${minutes}${seconds}`, 10);
};

module.exports = { dateEqualsNoMilliseconds, dateEqualsNoTime, utcNow, twelveUTC, timeAsInt };
