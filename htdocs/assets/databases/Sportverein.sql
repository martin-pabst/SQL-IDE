SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `Sportverein` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_german2_ci;
USE `Sportverein`;

CREATE TABLE `Sportverein` (
  `vorname` varchar(15) COLLATE utf8_unicode_ci NOT NULL,
  `nachname` varchar(25) COLLATE utf8_unicode_ci NOT NULL,
  `gebDat` date NOT NULL,
  `sportart` varchar(15) COLLATE utf8_unicode_ci NOT NULL,
  `vereinsbeitritt` int(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO `Sportverein` (`vorname`, `nachname`, `gebDat`, `sportart`, `vereinsbeitritt`) VALUES
('Andy', 'Tür ', '2009-01-03', 'Fussball', 2015),
('Ann', 'Geber ', '2009-01-29', 'Turnen', 2017),
('Ann', 'Zeiger', '2009-11-11', 'Turnen', 2015),
('Ann', 'Zug', '2009-11-24', 'Turnen', 2016),
('Anna', 'Nass ', '2009-01-16', 'Judo', 2016),
('Ben', 'Nimmdich ', '2009-02-11', 'Judo', 2018),
('Bernhard', 'Diener ', '2009-02-24', 'Fussball', 2015),
('Bill', 'Yard ', '2009-03-09', 'Parkur', 2016),
('Cindy', 'Kerzenan', '2009-12-07', 'Volleyball', 2017),
('Clair', 'Grube', '2009-10-29', 'Turnen', 2018),
('Ellen', 'Bogen', '2009-12-11', 'Volleyball', 2019),
('Ellen', 'Lang', '2009-10-03', 'Turnen', 2016),
('Erkan', 'Alles ', '2009-04-04', 'Judo', 2018),
('Frank', 'Reich ', '2009-04-17', 'Volleyball', 2019),
('Gerd', 'Nehr ', '2009-04-30', 'Fussball', 2016),
('Harry', 'Bo', '2009-12-20', 'Fussball', 2018),
('Hella', 'Wahnsinn', '2009-08-25', 'Bewegungskünste', 2017),
('Ina', 'Rein ', '2009-05-13', 'Bewegungskünste', 2017),
('Inge', 'Neur', '2009-12-02', 'Volleyball', 2019),
('Ismir', 'Schnuppe ', '2009-05-26', 'Fussball', 2018),
('Jim', 'Panse ', '2009-08-12', 'Bewegungskünste', 2016),
('Kai', 'Sehr ', '2009-06-08', 'Parkur', 2015),
('Ken', 'Wott', '2009-03-22', 'Volleyball', 2019),
('Klara', 'Himmel', '2009-09-07', 'Bewegungskünste', 2018),
('Marion', 'Nette ', '2009-06-21', 'Parkur', 2016),
('Marta', 'Pfahl ', '2009-07-04', 'Judo', 2017),
('Mira', 'Belle', '2009-07-17', 'Judo', 2018),
('Rosa', 'Blume', '2009-09-20', 'Turnen', 2015),
('Rosa', 'Wolke', '2009-10-16', 'Turnen', 2017),
('Sam', 'Urai ', '2009-07-30', 'Bewegungskünste', 2015);


ALTER TABLE `Sportverein`
  ADD PRIMARY KEY (`vorname`,`nachname`,`gebDat`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
