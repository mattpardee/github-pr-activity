module.exports = (str, prState) => {
  if (typeof prState === 'undefined') {
    console.log(str);
    return;
  }

  if (prState === 'MERGED') console.log(str.green);
  else if (prState === 'CLOSED') console.log(str.red);
  else console.log(str.yellow);
};
